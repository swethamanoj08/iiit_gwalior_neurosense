import time
from pathlib import Path

import pandas as pd
import streamlit as st


DATA_FILE = Path("stress_log.csv")
REFRESH_SECONDS = 5


def load_data() -> pd.DataFrame:
    if not DATA_FILE.exists():
        return pd.DataFrame(
            columns=[
                "timestamp",
                "blinks",
                "ear",
                "fatigue_score",
                "stress_score",
            ]
        )

    df = pd.read_csv(
        DATA_FILE,
        header=None,
        names=[
            "timestamp",
            "blinks",
            "ear",
            "fatigue_score",
            "stress_score",
        ],
        parse_dates=["timestamp"],
    )

    # Ensure numeric types for calculations
    for col in ["blinks", "ear", "fatigue_score", "stress_score"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Derive a simple focus metric from fatigue (higher fatigue → lower focus)
    df["focus_score"] = (100 - df["fatigue_score"]).clip(lower=0, upper=100)
    return df


def main() -> None:
    st.set_page_config(
        page_title="Wellness 360 Dashboard",
        page_icon="😌",
        layout="wide",
    )

    st.title("Wellness 360 – Live Wellness Dashboard")
    st.caption(
        "Real‑time view of your stress, fatigue and focus based on eye‑blink patterns."
    )

    # Simple refresh hint – Streamlit reruns this script
    # whenever you interact with any widget or press "R".
    st.sidebar.header("Dashboard")
    st.sidebar.write(
        "To refresh the data, use any widget interaction "
        "or press **R** in the browser while the app is focused."
    )

    df = load_data()

    if df.empty:
        st.warning(
            "No data found yet. Make sure your camera script is running and "
            "logging to `stress_log.csv` using `log_stress_event(...)`."
        )
        return

    latest = df.iloc[-1]

    # Handle possible NaN values gracefully for display
    def safe_int(value):
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0

    def safe_float(value, digits: int = 3):
        try:
            return f"{float(value):.{digits}f}"
        except (TypeError, ValueError):
            return f"{0:.{digits}f}"

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Blinks (session)", safe_int(latest["blinks"]))
    col2.metric("EAR (eye aspect ratio)", safe_float(latest["ear"], 3))
    col3.metric("Fatigue Score", safe_int(latest["fatigue_score"]))
    col4.metric("Stress Score", safe_int(latest["stress_score"]))

    st.divider()

    left, right = st.columns([2, 1])

    with left:
        st.subheader("Trends over time")
        plot_cols = ["fatigue_score", "stress_score", "focus_score"]
        st.line_chart(df.set_index("timestamp")[plot_cols])

    with right:
        st.subheader("Recent readings")
        st.dataframe(
            df.tail(20).sort_values("timestamp", ascending=False),
            use_container_width=True,
            height=400,
        )

    st.divider()
    st.caption(
        "Tip: Run your existing wellness camera script to continuously log data, "
        "then start this dashboard with `streamlit run wellness_dashboard.py`."
    )


if __name__ == "__main__":
    main()

