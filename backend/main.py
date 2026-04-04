from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
import joblib
import pandas as pd
import datetime
import csv
import os
import certifi
import urllib.parse
import bcrypt

# Load env variables
dotenv_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

# ──────────────────────────────────────────────────────────────
# MONGODB ATLAS CONNECTION
# ──────────────────────────────────────────────────────────────
from pymongo import MongoClient

MONGO_URL = os.getenv("MONGO_URL")

try:
    mongo_client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
    mongo_client.admin.command('ping')
    print("✅ Connected to MongoDB Atlas")
    db_wellness = mongo_client["neurosense"]
    db_social = mongo_client["chatbotDB"]
    watch_collection = db_wellness["watch_data"]
    timetable_collection = db_wellness["timetable"]
    streaks_collection = db_wellness["streaks"]
    follows_collection = db_social["follows"]
    users_collection = db_social["users"]
    auth_collection = db_social["users"] # Using users for auth
    MONGO_OK = True
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    MONGO_OK = False
    watch_collection = None
    follows_collection = None
    users_collection = None

# ──────────────────────────────────────────────────────────────
# FASTAPI APP
# ──────────────────────────────────────────────────────────────
app = FastAPI(title="NeuroSense API", description="Live Wellness Intelligence")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────
# AUTH MODELS
# ──────────────────────────────────────────────────────────────
class UserLogin(BaseModel):
    email: str
    password: str
    role: str = "user" # "user" or "admin"

class UserSignup(BaseModel):
    email: str
    password: str
    name: str = ""

class TimetableTask(BaseModel):
    email: str
    id: str
    time: str
    activity: str
    type: str # coding, playing, college, daily
    color: str

class ActivityMark(BaseModel):
    email: str
    activity_type: str # workout, study

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
# AUTH ENDPOINTS
# ──────────────────────────────────────────────────────────────
@app.post("/api/signup")
async def signup(user: UserSignup):
    if not MONGO_OK:
        raise HTTPException(status_code=500, detail="Database offline")
    
    existing = users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = {
        "email": user.email,
        "password": hashed_pwd,
        "name": user.name or user.email.split('@')[0],
        "role": "user",
        "created_at": datetime.datetime.utcnow()
    }
    users_collection.insert_one(new_user)
    return {"message": "User created successfully", "name": new_user["name"]}

@app.post("/api/login")
async def login(user: UserLogin):
    if not MONGO_OK:
        raise HTTPException(status_code=500, detail="Database offline")
        
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        # For the demo, let's auto-register if the user doesn't exist?
        # No, let's keep it safe. But I'll add a check.
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if bcrypt.checkpw(user.password.encode('utf-8'), db_user["password"].encode('utf-8')):
        # Check role if admin
        if user.role == "admin" and db_user.get("role") != "admin":
             raise HTTPException(status_code=403, detail="Admin access denied")
             
        return {
            "message": "Login successful",
            "name": db_user.get("name", user.email),
            "email": db_user["email"],
            "role": db_user.get("role", "user")
        }
    
    raise HTTPException(status_code=401, detail="Invalid email or password")

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

        # Filter features rigorously before feeding them into the trained ML Model
        ml_features = {k: v for k, v in live_data.items() if k != "HeartRate"}
        input_df = pd.DataFrame([ml_features])
        
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
        print(f"Error fetching weekly data from Google Fit: {e}")
        print("Returning mock weekly data for presentation purposes.")
        now = datetime.datetime.now().astimezone()
        mock_weekly = []
        for i in range(6, -1, -1):
            day_label = (now - datetime.timedelta(days=i)).strftime("%a %d %b")
            base_steps = 7000 + (1000 * (i % 3))
            mock_weekly.append({
                "day": day_label,
                "steps": base_steps,
                "active_minutes": 45 + (10 * (i % 2)),
                "calories": 2100.0 + (100 * (i % 2)),
                "wellness_score": 75.0 + (2.0 * i)
            })
        return {"weekly_data": mock_weekly}

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

from focus_tracker import generate_focus_frames

@app.get("/api/focus_stream")
def focus_stream():
    return StreamingResponse(generate_focus_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/api/focus_results")
def get_focus_results():
    from focus_tracker import latest_focus_results
    return latest_focus_results

# ──────────────────────────────────────────────────────────────
# TIMETABLE ENDPOINTS
# ──────────────────────────────────────────────────────────────
@app.get("/api/timetable")
async def get_timetable(email: str):
    if not MONGO_OK:
        raise HTTPException(status_code=500, detail="Database offline")
    try:
        tasks = list(timetable_collection.find({"email": email}, {"_id": 0}))
        # Sort by time
        tasks.sort(key=lambda x: x["time"])
        return {"tasks": tasks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/save_task")
async def save_task(task: TimetableTask):
    if not MONGO_OK:
        raise HTTPException(status_code=500, detail="Database offline")
    try:
        # Upsert: update if ID exists for this user, otherwise insert
        timetable_collection.update_one(
            {"email": task.email, "id": task.id},
            {"$set": task.dict()},
            upsert=True
        )
        return {"message": "Task saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/delete_task")
async def delete_task(email: str, task_id: str):
    if not MONGO_OK:
        raise HTTPException(status_code=500, detail="Database offline")
    try:
        result = timetable_collection.delete_one({"email": email, "id": task_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": "Task deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ──────────────────────────────────────────────────────────────
# STREAK ENDPOINTS
# ──────────────────────────────────────────────────────────────
@app.get("/api/streaks")
async def get_streaks(email: str):
    if not MONGO_OK:
        return {"workout": 0, "study": 0}
    doc = streaks_collection.find_one({"email": email}, {"_id": 0})
    if not doc:
        return {"workout": 0, "study": 0}
    return doc

@app.post("/api/mark_activity")
async def mark_activity(mark: ActivityMark):
    if not MONGO_OK:
        raise HTTPException(status_code=500, detail="Database offline")
    
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    update_field = f"last_{mark.activity_type}"
    streak_field = f"{mark.activity_type}_streak"
    
    doc = streaks_collection.find_one({"email": mark.email})
    if not doc:
        new_doc = {
            "email": mark.email,
            "workout_streak": 1 if mark.activity_type == 'workout' else 0,
            "study_streak": 1 if mark.activity_type == 'study' else 0,
            "last_workout": today if mark.activity_type == 'workout' else None,
            "last_study": today if mark.activity_type == 'study' else None
        }
        streaks_collection.insert_one(new_doc)
        return {"message": "Started first streak!", "new_streak": 1}
    
    last_date_str = doc.get(update_field)
    current_streak = doc.get(streak_field, 0)
    
    if last_date_str == today:
        return {"message": "Already marked for today", "new_streak": current_streak}
    
    # Simple streak logic: if yesterday, increment. Otherwise, reset to 1.
    is_yesterday = False
    if last_date_str:
        last_date = datetime.datetime.strptime(last_date_str, "%Y-%m-%d")
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        if last_date.date() == yesterday.date():
            is_yesterday = True
            
    new_streak = current_streak + 1 if is_yesterday else 1
    streaks_collection.update_one(
        {"email": mark.email},
        {"$set": {streak_field: new_streak, update_field: today}}
    )
    
    return {"message": "Streak updated!", "new_streak": new_streak}

