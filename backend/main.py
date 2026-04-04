from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import datetime
import csv
import os

# ──────────────────────────────────────────────────────────────
# MONGODB ATLAS CONNECTION
# ──────────────────────────────────────────────────────────────
from pymongo import MongoClient

MONGO_URL = "mongodb+srv://piyushbhole37_db_user:g00BqxsW0XXpvyic@cluster0.1ghsmpz.mongodb.net/neurosense?retryWrites=true&w=majority"

try:
    mongo_client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    mongo_client.admin.command('ping')
    print("✅ Connected to MongoDB Atlas")
    db = mongo_client["neurosense"]
    watch_collection = db["watch_data"]
    MONGO_OK = True
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    MONGO_OK = False
    watch_collection = None

# ──────────────────────────────────────────────────────────────
# FASTAPI APP
# ──────────────────────────────────────────────────────────────
app = FastAPI(title="NeuroSense API", description="Live Wellness Intelligence")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────
# ML MODEL
# ──────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "wellness_model.pkl")
try:
    model = joblib.load(MODEL_PATH)
    print("✅ Random Forest Model Loaded (R²=0.975)")
except Exception as e:
    print(f"⚠ ML Model load failed: {e}")
    model = None

# ──────────────────────────────────────────────────────────────
# CSV LOGGER
# ──────────────────────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(__file__), "watch_data.csv")

def save_to_csv(data: dict, score: float):
    file_exists = os.path.isfile(CSV_PATH)
    with open(CSV_PATH, mode='a', newline='') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "steps", "calories", "very_active_min",
                             "fairly_active_min", "lightly_active_min", "sedentary_min", "wellness_score"])
        writer.writerow([
            datetime.datetime.now().isoformat(),
            data.get("TotalSteps", 0),
            data.get("Calories", 0),
            data.get("VeryActiveMinutes", 0),
            data.get("FairlyActiveMinutes", 0),
            data.get("LightlyActiveMinutes", 0),
            data.get("SedentaryMinutes", 0),
            score
        ])

# ──────────────────────────────────────────────────────────────
# MONGODB LOGGER
# ──────────────────────────────────────────────────────────────
def save_to_mongo(data: dict, score: float, source: str = "Google Fit"):
    if not MONGO_OK or watch_collection is None:
        return
    try:
        doc = {
            "timestamp": datetime.datetime.utcnow(),
            "source": source,
            "steps": data.get("TotalSteps", 0),
            "calories": data.get("Calories", 0),
            "very_active_minutes": data.get("VeryActiveMinutes", 0),
            "fairly_active_minutes": data.get("FairlyActiveMinutes", 0),
            "lightly_active_minutes": data.get("LightlyActiveMinutes", 0),
            "sedentary_minutes": data.get("SedentaryMinutes", 0),
            "wellness_score": score
        }
        watch_collection.insert_one(doc)
        print(f"📦 Saved to MongoDB — Score: {score}")
    except Exception as e:
        print(f"⚠ MongoDB insert failed: {e}")

# ──────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────
def score_to_feedback(score: float) -> str:
    if score >= 80:
        return "Excellent! Your activity data reflects a highly stress-resilient and healthy lifestyle."
    elif score >= 60:
        return "Good wellness levels. A bit more movement could push you into the excellent zone!"
    elif score >= 40:
        return "Moderate wellness detected. Try reducing sedentary time and taking short walks."
    else:
        return "Low wellness score. Your watch data suggests high sedentary activity. Get moving!"

# ──────────────────────────────────────────────────────────────
# ROUTES
# ──────────────────────────────────────────────────────────────
class ActivityData(BaseModel):
    TotalSteps: float
    VeryActiveMinutes: float
    FairlyActiveMinutes: float
    LightlyActiveMinutes: float
    SedentaryMinutes: float
    Calories: float

@app.get("/")
def read_root():
    return {
        "status": "NeuroSense API is live ✅",
        "model": "Random Forest v1 (R²=0.975)",
        "mongodb": "Connected ✅" if MONGO_OK else "Disconnected ❌"
    }

@app.post("/api/predict_wellness")
def predict_wellness(data: ActivityData):
    if model is None:
        raise HTTPException(status_code=500, detail="ML Model not loaded.")
    try:
        input_df = pd.DataFrame([data.dict()])
        score = round(float(model.predict(input_df)[0]), 1)
        save_to_csv(data.dict(), score)
        save_to_mongo(data.dict(), score, source="Manual Input")
        return {"wellness_score": score, "feedback": score_to_feedback(score)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

from google_fit_service import get_live_watch_data, get_google_fit_service

@app.get("/api/live_wellness")
def get_live_wellness():
    """Fetches today's Google Fit data, scores it with AI, saves to MongoDB + CSV."""
    if model is None:
        raise HTTPException(status_code=500, detail="ML Model not loaded.")
    try:
        live_data = get_live_watch_data()
        if not live_data:
            raise HTTPException(status_code=500, detail="Failed to extract data from Google Fit.")

        input_df = pd.DataFrame([live_data])
        score = round(float(model.predict(input_df)[0]), 1)

        # Persist every sync to MongoDB and CSV
        save_to_csv(live_data, score)
        save_to_mongo(live_data, score, source="Google Fit Live")

        return {
            "source": "Google Fit Live",
            "date": datetime.date.today().isoformat(),
            "mongodb_saved": MONGO_OK,
            "raw_metrics": live_data,
            "wellness_score": score,
            "feedback": score_to_feedback(score)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/watch_status")
def get_watch_status():
    """Quick check to confirm Google Fit + MongoDB are both alive."""
    mongo_status = "Connected ✅" if MONGO_OK else "Disconnected ❌"
    try:
        data = get_live_watch_data()
        watch_status = "Fetching Data ✅" if data else "No data returned ⚠"
        steps = data.get("TotalSteps", 0) if data else 0
    except Exception as e:
        watch_status = f"Error: {str(e)}"
        steps = 0
    return {
        "google_fit": watch_status,
        "live_steps_today": steps,
        "mongodb": mongo_status,
        "ml_model": "Loaded ✅" if model else "Failed ❌"
    }

@app.get("/api/weekly_wellness")
def get_weekly_wellness():
    """Fetches last 7 days of Google Fit data and returns a wellness score per day."""
    if model is None:
        raise HTTPException(status_code=500, detail="ML Model not loaded.")
    try:
        service = get_google_fit_service()
        now = datetime.datetime.now().astimezone()
        today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start = today_midnight - datetime.timedelta(days=6)

        body = {
            "aggregateBy": [
                {"dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"},
                {"dataTypeName": "com.google.calories.expended"},
                {"dataTypeName": "com.google.active_minutes"}
            ],
            "bucketByTime": {"durationMillis": 86400000},
            "startTimeMillis": int(start.timestamp() * 1000),
            "endTimeMillis": int(now.timestamp() * 1000)
        }
        response = service.users().dataset().aggregate(userId="me", body=body).execute()

        weekly_results = []
        for bucket in response.get("bucket", []):
            day_start_ms = int(bucket.get("startTimeMillis", 0))
            day_label = datetime.datetime.fromtimestamp(day_start_ms / 1000).strftime("%a %d %b")
            steps = calories = active_minutes = 0

            for dataset in bucket.get("dataset", []):
                for point in dataset.get("point", []):
                    for value in point.get("value", []):
                        val = value.get("intVal", value.get("fpVal", 0))
                        src = dataset.get("dataSourceId", "")
                        if "step_count" in src:
                            steps += val
                        elif "calories" in src:
                            calories += val
                        elif "active_minutes" in src:
                            active_minutes += val

            metrics = {
                "TotalSteps": float(steps),
                "VeryActiveMinutes": float(active_minutes * 0.3),
                "FairlyActiveMinutes": float(active_minutes * 0.4),
                "LightlyActiveMinutes": float(active_minutes * 0.3),
                "SedentaryMinutes": float(max(0, 1440 - active_minutes - 480)),
                "Calories": float(calories) if calories > 0 else 2000.0
            }
            score = round(float(model.predict(pd.DataFrame([metrics]))[0]), 1)

            weekly_results.append({
                "day": day_label,
                "steps": int(steps),
                "active_minutes": int(active_minutes),
                "calories": round(float(calories), 1),
                "wellness_score": score
            })

        return {"weekly_data": weekly_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def get_history(limit: int = 20):
    """Returns last N wellness readings saved in MongoDB."""
    if not MONGO_OK:
        raise HTTPException(status_code=503, detail="MongoDB not connected.")
    try:
        docs = list(watch_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
        for d in docs:
            if "timestamp" in d:
                d["timestamp"] = d["timestamp"].isoformat()
        return {"history": docs, "count": len(docs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
