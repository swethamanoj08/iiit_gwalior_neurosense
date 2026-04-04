import os
import datetime
import time
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = ['https://www.googleapis.com/auth/fitness.activity.read']
CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "token.json")

def get_google_fit_service():
    """Authenticate and return the Google Fit API service."""
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())

    service = build('fitness', 'v1', credentials=creds)
    return service

def get_live_watch_data():
    """Extracts live parameters required by our ML model from Google Fit."""
    service = get_google_fit_service()

    # Rolling 24-hour window — avoids zeroing out at midnight
    # This always shows the last 24 hours of activity regardless of time of day
    now = datetime.datetime.now().astimezone()
    yesterday = now - datetime.timedelta(hours=24)
    
    start_time_millis = int(yesterday.timestamp() * 1000)
    end_time_millis = int(now.timestamp() * 1000)

    # We will ask Google for steps, calories, and active minutes
    # Using the specific 'estimated_steps' aggregation to exactly match Android's merged Health Connect screen
    body = {
        "aggregateBy": [
            {"dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"},
            {"dataTypeName": "com.google.calories.expended"},
            {"dataTypeName": "com.google.active_minutes"}
        ],
        "bucketByTime": {"durationMillis": 86400000}, # 24h bucket
        "startTimeMillis": start_time_millis,
        "endTimeMillis": end_time_millis
    }

    try:
        response = service.users().dataset().aggregate(userId="me", body=body).execute()
        
        # Initialize defaults
        total_steps = 0
        calories = 0
        active_minutes = 0

        # Parse Google Fit payload madness
        for bucket in response.get('bucket', []):
            for dataset in bucket.get('dataset', []):
                for point in dataset.get('point', []):
                    for value in point.get('value', []):
                        val = value.get('intVal', value.get('fpVal', 0))
                        # Identify the data source based on what dataset it belonged to implicitly
                        # Wait, we know the order of aggregateBy matches dataset order in response usually
                        # But safely, we can check data source
                        
                        origin = point.get('originDataSourceId', '')
                        if 'step_count' in dataset.get('dataSourceId', ''):
                            total_steps += val
                        elif 'calories' in dataset.get('dataSourceId', ''):
                            calories += val
                        elif 'active_minutes' in dataset.get('dataSourceId', ''):
                            active_minutes += val

        # Derive VeryActive / Fairly / Lightly from raw active_minutes
        very_active = active_minutes * 0.3
        fairly_active = active_minutes * 0.4
        lightly_active = active_minutes * 0.3
        
        # Sedentary = 24h - active time - typical sleep
        sedentary = max(0, 1440 - active_minutes - 480)

        # DO NOT fake calories — use 0 if untracked; the ML model can handle low values
        data = {
            "TotalSteps": float(total_steps),
            "VeryActiveMinutes": float(very_active),
            "FairlyActiveMinutes": float(fairly_active),
            "LightlyActiveMinutes": float(lightly_active),
            "SedentaryMinutes": float(sedentary),
            "Calories": float(calories)   # Real value only. 0 is valid at night.
        }
        return data

    except Exception as e:
        print(f"Error fetching from Google Fit: {e}")
        return None

if __name__ == "__main__":
    print("Authenticating with Google Fit & fetching live data...")
    live_data = get_live_watch_data()
    print("--- LIVE WATCH DATA ---")
    print(live_data)
