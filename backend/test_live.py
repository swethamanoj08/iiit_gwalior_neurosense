import joblib
import pandas as pd
import os
from google_fit_service import get_live_watch_data

MODEL_PATH = os.path.join(os.path.dirname(__file__), "wellness_model.pkl")

def run_live_test():
    print("--- NEUROSENSE REAL-TIME WATCH PIPELINE ---")
    
    print("\n1. Connecting to Google Fit via OAuth...")
    print("   (A browser window may open asking you to log in to your Google Account)")
    
    try:
        live_data = get_live_watch_data()
    except Exception as e:
        print(f"\nOAuth Failed! Make sure you added your test email to the Google Cloud OAuth Consent Screen.\nError: {e}")
        return

    if not live_data:
        print("\nFailed to extract live data from Google Fit.")
        return

    print("\n[SUCCESS] Extracted live smartwatch parameters:")
    for key, value in live_data.items():
        print(f"  {key}: {value:.1f}")

    print("\n2. Pushing Live Data into the Machine Learning Engine...")
    try:
        model = joblib.load(MODEL_PATH)
        input_df = pd.DataFrame([live_data])
        
        prediction = model.predict(input_df)[0]
        score = round(prediction, 1)
        
        print(f"\n=========================================")
        print(f" AI LIVE WELLNESS PREDICTION: {score} / 100")
        print(f"=========================================")
        
        if score > 80:
            print("Verdict: Your live data shows you are highly active and stress-resilient today!")
        elif score > 50:
            print("Verdict: Your live data reflects moderate wellness.")
        else:
            print("Verdict: Your live data reads high-sedentary or low-activity. Stress vulnerability is high today.")
            
    except Exception as e:
        print(f"\nFailed to run ML Model: {e}")

if __name__ == "__main__":
    run_live_test()
