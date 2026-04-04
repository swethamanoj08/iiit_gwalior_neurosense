import os
import datetime
import time
import socket

# Prevent silent infinite hangs on Google Servers
socket.setdefaulttimeout(10)

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.location.read'
]
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
    try:
        service = get_google_fit_service()

        # Reset at midnight (00:00) so the data aligns perfectly with the physical watch UI
        now = datetime.datetime.now().astimezone()
        today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        start_time_millis = int(today_midnight.timestamp() * 1000)
        end_time_millis = int(now.timestamp() * 1000)

        # We will ask Google for steps, calories, and active minutes
        # Using the specific 'estimated_steps' aggregation to exactly match Android's merged Health Connect screen
        body_activity = {
            "aggregateBy": [
                {"dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"},
                {"dataTypeName": "com.google.calories.expended"},
                {"dataTypeName": "com.google.active_minutes"}
            ],
            "bucketByTime": {"durationMillis": 86400000},
            "startTimeMillis": start_time_millis,
            "endTimeMillis": end_time_millis
        }

        response = service.users().dataset().aggregate(userId="me", body=body_activity).execute()
        
        # Initialize defaults
        total_steps = 0
        calories = 0
        active_minutes = 0
        heart_rate_sum = 0
        heart_rate_count = 0

        # Parse Google Fit payload madness
        for bucket in response.get('bucket', []):
            for dataset in bucket.get('dataset', []):
                for point in dataset.get('point', []):
                    for value in point.get('value', []):
                        val = value.get('intVal', value.get('fpVal', 0))
                        
                        origin = point.get('originDataSourceId', '')
                        if 'step_count' in dataset.get('dataSourceId', ''):
                            total_steps += val
                        elif 'calories' in dataset.get('dataSourceId', ''):
                            calories += val
                        elif 'active_minutes' in dataset.get('dataSourceId', ''):
                            active_minutes += val
                        elif 'heart_rate' in dataset.get('dataSourceId', ''):
                            heart_rate_sum += val
                            heart_rate_count += 1

        # -------------------------------------------------------------------------
        # TRUE LIVE API PASSTHROUGH
        # -------------------------------------------------------------------------
        # The variables will dynamically use the exact true numbers fetched by
        # the Google Fit Cloud API since the app and cloud are now fully synced.
        # -------------------------------------------------------------------------
        # -------------------------------------------------------------------------

        # Derive VeryActive / Fairly / Lightly from raw active_minutes
        very_active = active_minutes * 0.3
        fairly_active = active_minutes * 0.4
        lightly_active = active_minutes * 0.3
        
        # Sedentary = 24h - active time - typical sleep
        sedentary = max(0, 1440 - active_minutes - 480)

        # Now try to separately fetch Heart Rate
        try:
            body_hr = {
                "aggregateBy": [
                    {"dataTypeName": "com.google.heart_rate.bpm"}
                ],
                "bucketByTime": {"durationMillis": 86400000},
                "startTimeMillis": start_time_millis,
                "endTimeMillis": end_time_millis
            }
            hr_resp = service.users().dataset().aggregate(userId="me", body=body_hr).execute()
            for b in hr_resp.get('bucket', []):
                for d in b.get('dataset', []):
                    for p in d.get('point', []):
                        for v in p.get('value', []):
                            heart_rate_sum += v.get('fpVal', 0)
                            heart_rate_count += 1
        except Exception as e:
            print(f"Warning: Heart Rate fetch failed or skipped: {e}")

        heart_rate = (heart_rate_sum / heart_rate_count) if heart_rate_count > 0 else 72.0

        data = {
            "TotalSteps": float(total_steps),
            "VeryActiveMinutes": float(very_active),
            "FairlyActiveMinutes": float(fairly_active),
            "LightlyActiveMinutes": float(lightly_active),
            "SedentaryMinutes": float(sedentary),
            "Calories": float(calories),
            "HeartRate": float(heart_rate)
        }
        return data

    except Exception as e:
        print(f"Error fetching from Google Fit: {e}")
        print("Returning mock data for presentation purposes.")
        return {
            "TotalSteps": 8432.0,
            "VeryActiveMinutes": 24.0,
            "FairlyActiveMinutes": 45.0,
            "LightlyActiveMinutes": 120.0,
            "SedentaryMinutes": 520.0,
            "Calories": 2350.0
        }

def get_hourly_watch_data():
    """Extracts hourly buckets of parameters from Google Fit for the last 24 hours."""
    try:
        service = get_google_fit_service()

        now = datetime.datetime.now().astimezone()
        start = now - datetime.timedelta(hours=24)
        
        start_time_millis = int(start.timestamp() * 1000)
        end_time_millis = int(now.timestamp() * 1000)

        body_activity = {
            "aggregateBy": [
                {"dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"},
                {"dataTypeName": "com.google.calories.expended"},
                {"dataTypeName": "com.google.active_minutes"}
            ],
            "bucketByTime": {"durationMillis": 3600000},
            "startTimeMillis": start_time_millis,
            "endTimeMillis": end_time_millis
        }

        response = service.users().dataset().aggregate(userId="me", body=body_activity).execute()
        
        hourly_data = []

        for bucket in response.get('bucket', []):
            start_ms = int(bucket.get('startTimeMillis', 0))
            dt = datetime.datetime.fromtimestamp(start_ms / 1000.0)
            
            steps = calories = active_minutes = 0
            hr_sum = 0
            hr_count = 0
            for dataset in bucket.get('dataset', []):
                for point in dataset.get('point', []):
                    for value in point.get('value', []):
                        val = value.get('intVal', value.get('fpVal', 0))
                        if 'step_count' in dataset.get('dataSourceId', ''):
                            steps += val
                        elif 'calories' in dataset.get('dataSourceId', ''):
                            calories += val
                        elif 'active_minutes' in dataset.get('dataSourceId', ''):
                            active_minutes += val
                        elif 'heart_rate' in dataset.get('dataSourceId', ''):
                            hr_sum += val
                            hr_count += 1

            very_active = active_minutes * 0.3
            fairly_active = active_minutes * 0.4
            lightly_active = active_minutes * 0.3
            sedentary = max(0, 60 - active_minutes)

            # Assign default 72 for now to map later
            avg_hr = 72.0

            hourly_data.append({
                "timestamp": dt.isoformat(),
                "hour": dt.hour,
                "date": dt.date().isoformat(),
                "TotalSteps": float(steps),
                "VeryActiveMinutes": float(very_active),
                "FairlyActiveMinutes": float(fairly_active),
                "LightlyActiveMinutes": float(lightly_active),
                "SedentaryMinutes": float(sedentary),
                "Calories": float(calories),
                "HeartRate": float(avg_hr)
            })

        # Inject Heart Rate iteratively into hourly data
        try:
            body_hr = {
                "aggregateBy": [
                    {"dataTypeName": "com.google.heart_rate.bpm"}
                ],
                "bucketByTime": {"durationMillis": 3600000},
                "startTimeMillis": start_time_millis,
                "endTimeMillis": end_time_millis
            }
            hr_resp = service.users().dataset().aggregate(userId="me", body=body_hr).execute()
            for i, bucket in enumerate(hr_resp.get('bucket', [])):
                if i < len(hourly_data):
                    h_sum = 0
                    h_count = 0
                    for dataset in bucket.get('dataset', []):
                        for point in dataset.get('point', []):
                            for v in point.get('value', []):
                                h_sum += v.get('fpVal', 0)
                                h_count += 1
                    if h_count > 0:
                        hourly_data[i]["HeartRate"] = float(h_sum / h_count)
        except Exception as e:
            print(f"Warning: Hourly Heart Rate fetch failed: {e}")

        return hourly_data

    except Exception as e:
        print(f"Error fetching hourly data from Google Fit: {e}")
        return []

if __name__ == "__main__":
    print("Authenticating with Google Fit & fetching live data...")
    live_data = get_live_watch_data()
    print("--- LIVE WATCH DATA ---")
    print(live_data)
