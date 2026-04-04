"""
NeuroSense — Gradio Live Wearable Data Stream
Streams wearable_dataset.csv row-by-row (1 row/second) through trained ML models
and displays real-time predictions in a Gradio interface.
"""

import gradio as gr
import pandas as pd
import numpy as np
import joblib
import time
import sys
import os
import datetime
from pymongo import MongoClient

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from google_fit_service import get_hourly_watch_data

# ── MongoDB Atlas ─────────────────────────────────────────────────────────────
MONGO_URL = "mongodb+srv://piyushbhole37_db_user:g00BqxsW0XXpvyic@cluster0.1ghsmpz.mongodb.net/neurosense?retryWrites=true&w=majority"
try:
    _mc  = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    _mc.admin.command("ping")
    col_stream = _mc["neurosense"]["gradio_stream"]
    MONGO_OK = True
    print("✅ Gradio: MongoDB Atlas connected")
except Exception as _e:
    print(f"❌ Gradio: MongoDB unavailable — {_e}")
    MONGO_OK = False
    col_stream = None


def _save_row(doc: dict):
    if MONGO_OK and col_stream is not None:
        try:
            col_stream.insert_one(doc)
        except Exception:
            pass

# ── Load dataset ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
df = pd.read_csv(os.path.join(BASE_DIR, "wearable_dataset.csv"))

# ── Feature engineering (same as train_model.py) ─────────────────────────────
df["activity_level"] = df["steps"] / (df["heart_rate"] + 1)
df["is_night"] = df["hour"].apply(lambda x: 1 if x < 6 or x > 22 else 0)

df["stress"] = df.apply(
    lambda r: "High" if r["heart_rate"] > 100 and r["steps"] < 300
    else ("Medium" if r["heart_rate"] > 85 else "Low"),
    axis=1,
)
df["health_score"] = (
    0.4 * df["sleep_quality"] * 100
    + 0.3 * (df["steps"] > 800).astype(int) * 100
    + 0.3 * ((df["heart_rate"].between(70, 100)).astype(int) * 100)
)
df["anomaly"] = df.apply(
    lambda x: 1 if x["heart_rate"] > 120 or x["heart_rate"] < 45 or x["steps"] > 2000 else 0,
    axis=1,
)

FEATURES = ["steps", "heart_rate", "sleep_state", "sleep_quality", "hour", "activity_level", "is_night"]

# ── Load models ───────────────────────────────────────────────────────────────
stress_model  = joblib.load(os.path.join(BASE_DIR, "stress_model.pkl"))
health_model  = joblib.load(os.path.join(BASE_DIR, "health_model.pkl"))
anomaly_model = joblib.load(os.path.join(BASE_DIR, "anomaly_model.pkl"))

STRESS_MAP = {0: "High 🔴", 1: "Low 🟢", 2: "Medium 🟡"}   # LabelEncoder order: High=0, Low=1, Medium=2

def stress_emoji(label: str) -> str:
    return {"High": "🔴 High", "Medium": "🟡 Medium", "Low": "🟢 Low"}.get(label, label)

def anomaly_label(flag: int) -> str:
    return "⚠️ Anomaly Detected!" if flag else "✅ Normal"

def health_bar(score: float) -> str:
    filled = int(score / 100 * 20)
    return "█" * filled + "░" * (20 - filled) + f"  {score:.1f}/100"

def stream_data(user_id: int, start_row: int, num_rows: int):
    """
    Gradio generator: yields updated values every second.
    Pulls live data from Google Fit, streams it through ML models,
    and visualizes it in the Gradio dashboard while saving to MongoDB.
    """
    print(f"Fetching real hourly watch data for streaming...")
    hourly_watch_data = get_hourly_watch_data()
    
    if not hourly_watch_data:
        yield "No data returned from Google Fit.", 0, 0, 0.0, "N/A", "N/A", ""
        return

    # Convert to DataFrame to stream
    user_df = pd.DataFrame(hourly_watch_data).sort_values("timestamp").reset_index(drop=True)
    
    # Need to map the real Google Fit data to the models' expected features
    # ("steps", "heart_rate", "sleep_state", "sleep_quality", "hour", "activity_level", "is_night")
    # For now, derive placeholder sleep if not in Fit fetch
    user_df["steps"] = user_df["TotalSteps"]
    user_df["heart_rate"] = user_df["HeartRate"] # TRUE data from Google Fit plugin
    user_df["sleep_quality"] = 7.5
    user_df["sleep_state"] = 0
    user_df["activity_level"] = user_df["steps"] / (user_df["heart_rate"] + 1)
    user_df["is_night"] = user_df["hour"].apply(lambda x: 1 if x < 6 or x > 22 else 0)

    start = int(start_row)
    end   = min(start + int(num_rows), len(user_df))
    log_lines = []

    for idx in range(start, end):
        row = user_df.iloc[idx]
        X = row[FEATURES].values.reshape(1, -1)

        stress_pred  = STRESS_MAP.get(int(stress_model.predict(X)[0]), "?")
        health_pred  = float(health_model.predict(X)[0])
        anomaly_pred = int(anomaly_model.predict(X)[0])

        timestamp = f"{row['date']} {int(row['hour']):02d}:00"
        line = (
            f"[{timestamp}]  Steps: {int(row['steps']):>4}  "
            f"HR: {int(row['heart_rate'])} bpm  "
            f"Stress: {stress_pred:<12}  "
            f"Health: {health_pred:>5.1f}  "
            f"{anomaly_label(anomaly_pred)}"
        )
        log_lines.append(line)
        log_text = "\n".join(log_lines[-40:])  # keep last 40 lines visible

        # ── Persist every row to MongoDB ───────────────────────────────────────────
        _save_row({
            "timestamp":    datetime.datetime.utcnow(),
            "source":       "Google Fit Hourly Bucket",
            "row_index":    idx,
            "date":         str(row["date"]),
            "hour":         int(row["hour"]),
            "steps":        int(row["steps"]),
            "heart_rate":   int(row["heart_rate"]),
            "stress":       stress_pred,
            "health_score": round(health_pred, 1),
            "anomaly":      bool(anomaly_pred),
            "raw_fit_data": {
                "VeryActiveMinutes": float(row["VeryActiveMinutes"]),
                "Calories": float(row["Calories"])
            }
        })

        yield (
            log_text,
            int(row["steps"]),
            int(row["heart_rate"]),
            round(health_pred, 1),
            stress_pred,
            anomaly_label(anomaly_pred),
            health_bar(health_pred),
        )
        time.sleep(1)   # ← one update per second

# ── Gradio UI ─────────────────────────────────────────────────────────────────
with gr.Blocks(
    title="NeuroSense Live Stream",
    theme=gr.themes.Soft(primary_hue="violet", secondary_hue="cyan"),
    css="""
    #title  { text-align: center; color: #a78bfa; font-size: 2rem; font-weight: 800; }
    #sub    { text-align: center; color: #94a3b8; margin-top: -10px; margin-bottom: 18px; }
    .metric-box { background: #1e1b4b; border-radius: 12px; padding: 10px 16px; }
    #log_output textarea { font-family: 'Courier New', monospace; font-size: 12px;
                           background: #0f172a !important; color: #a3e635 !important; }
    """,
) as demo:

    gr.HTML("<h1 id='title'>🧠 NeuroSense — Live Wearable Stream</h1>")
    gr.HTML("<p id='sub'>Fetches real, hourly Google Fit data, models it, and streams it row-by-row</p>")

    with gr.Row():
        user_dd   = gr.Dropdown(choices=sorted(df["user_id"].unique().tolist()),
                                value=1, label="👤 Select User")
        start_sl  = gr.Slider(0, 150, value=0, step=1, label="Start Row")
        rows_sl   = gr.Slider(10, 200, value=60, step=10, label="Rows to Stream")

    run_btn = gr.Button("▶  Start Live Stream", variant="primary", size="lg")

    with gr.Row():
        out_steps   = gr.Number(label="👟 Steps",        elem_classes="metric-box")
        out_hr      = gr.Number(label="❤️ Heart Rate (bpm)", elem_classes="metric-box")
        out_health  = gr.Number(label="🏆 Health Score", elem_classes="metric-box")

    with gr.Row():
        out_stress  = gr.Textbox(label="😓 Stress Level",  elem_classes="metric-box")
        out_anomaly = gr.Textbox(label="🚨 Anomaly Flag",   elem_classes="metric-box")
        out_bar     = gr.Textbox(label="📊 Health Bar",     elem_classes="metric-box")

    out_log = gr.Textbox(
        label="📜 Live Log (last 40 records)",
        lines=18,
        max_lines=18,
        elem_id="log_output",
        interactive=False,
    )

    run_btn.click(
        fn=stream_data,
        inputs=[user_dd, start_sl, rows_sl],
        outputs=[out_log, out_steps, out_hr, out_health, out_stress, out_anomaly, out_bar],
    )

if __name__ == "__main__":
    demo.launch(share=False)
