from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import shutil
import uuid
import pymongo
from pymongo import MongoClient
import json
import os
import cv2
import mediapipe as mp
import numpy as np
import time
import bcrypt
import csv
from io import StringIO
from datetime import datetime

# -------------------------
# DATABASE SETUP
import certifi
import urllib.parse
password = urllib.parse.quote_plus("g00BqxsW0XXpvyic")
DATABASE_URL = f"mongodb+srv://piyushbhole37_db_user:{password}@cluster0.1ghsmpz.mongodb.net/?appName=Cluster0"
client = MongoClient(DATABASE_URL, tlsCAFile=certifi.where())
db = client.chatbotDB

def get_next_sequence_value(sequence_name):
    sequence_doc = db.counters.find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=pymongo.ReturnDocument.AFTER
    )
    return sequence_doc["sequence_value"]

def seed_user():
    try:
        existing_user = db.users.find_one({"username": "admin"})
        if not existing_user:
            hashed_pw = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            new_user = {
                "name": "George Spence",
                "username": "admin",
                "password_hash": hashed_pw,
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80",
                "join_date": "2023-09-01"
            }
            db.users.insert_one(new_user)
    except Exception as e:
        print(f"Warning: Could not connect to MongoDB. Database might be offline: {e}")

seed_user()

# -------------------------
# FASTAPI APP
# -------------------------
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# -------------------------
# SCHEMAS
# -------------------------
class StoryCreate(BaseModel):
    username: str
    image_url: str
class PostCreate(BaseModel):
    username: str
    content: str
    image_url: str = ""

class CommentCreate(BaseModel):
    comment: str

class UserAuth(BaseModel):
    username: str
    password: str
    name: str = ""

class TimetableSaveRequest(BaseModel):
    username: str
    allocations: dict # e.g. {"Sleep": 8, "Study": 5}

# -------------------------
# ROUTES
# -------------------------

# 👉 Create Post
@app.post("/create_post")
def create_post(post: PostCreate):
    post_id = get_next_sequence_value("post_id")
    new_post = {
        "id": post_id,
        "username": post.username,
        "content": post.content,
        "image_url": post.image_url,
        "likes": 0,
        "comments": ""
    }
    db.posts.insert_one(new_post)
    return {"message": "Post created", "post_id": post_id}

# 👉 Get All Posts (Filtered by friends if authenticated)
@app.get("/get_posts")
def get_posts(username: str = None):
    if username:
        follows = list(db.follows.find({"follower_username": username}))
        following_usernames = [f["followed_username"] for f in follows]
        following_usernames.append(username) # see own posts too
        posts = list(db.posts.find({"username": {"$in": following_usernames}}).sort("id", -1))
    else:
        posts = list(db.posts.find().sort("id", -1))
        
    usernames = list(set([p["username"] for p in posts]))
    users = list(db.users.find({"username": {"$in": usernames}}))
    user_dict = {u["username"]: u.get("avatar_url", "") for u in users}

    return [
        {
            "id": p["id"],
            "username": p["username"],
            "avatar_url": user_dict.get(p["username"], ""),
            "content": p["content"],
            "image_url": p.get("image_url", ""),
            "likes": p.get("likes", 0),
            "comments": p.get("comments", "").split("||") if p.get("comments", "") else []
        }
        for p in posts
    ]

# 👉 Upload Image
@app.post("/upload_image")
def upload_image(file: UploadFile = File(...)):
    filename = f"{uuid.uuid4()}_{file.filename.replace(' ', '_')}"
    filepath = f"static/{filename}"
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"image_url": filename}

# 👉 Create Story
@app.post("/create_story")
def create_story(story: StoryCreate):
    story_id = get_next_sequence_value("story_id")
    new_story = {
        "id": story_id,
        "username": story.username,
        "image_url": story.image_url,
        "created_at": datetime.now().isoformat()
    }
    db.stories.insert_one(new_story)
    return {"message": "Story added"}

# 👉 Get Stories
@app.get("/get_stories")
def get_stories():
    stories = list(db.stories.find().sort("id", -1).limit(30))
    usernames = list(set([s["username"] for s in stories]))
    users = list(db.users.find({"username": {"$in": usernames}}))
    user_dict = {u["username"]: u.get("avatar_url", "") for u in users}
    
    result = []
    for s in stories:
        result.append({
            "id": s["id"],
            "username": s["username"],
            "image_url": s["image_url"],
            "avatar_url": user_dict.get(s["username"], "")
        })
    return result

# 👉 Follow / Unfollow
@app.post("/follow/{username}")
def follow_user(username: str, data: dict):
    follower_username = data.get("username")
    if not follower_username:
        return {"error": "Missing follower"}
    exist = db.follows.find_one({"follower_username": follower_username, "followed_username": username})
    if not exist:
        db.follows.insert_one({"follower_username": follower_username, "followed_username": username})
    return {"message": f"Followed {username}"}

@app.post("/unfollow/{username}")
def unfollow_user(username: str, data: dict):
    follower_username = data.get("username")
    db.follows.delete_one({"follower_username": follower_username, "followed_username": username})
    return {"message": f"Unfollowed {username}"}

@app.get("/get_following/{username}")
def get_following(username: str):
    follows = list(db.follows.find({"follower_username": username}))
    return [f["followed_username"] for f in follows]

@app.get("/get_all_users")
def get_all_users():
    users = list(db.users.find().limit(20))
    return [{"username": u["username"], "name": u.get("name", ""), "avatar_url": u.get("avatar_url", "")} for u in users]

@app.get("/search_users")
def search_users(q: str = ""):
    users = list(db.users.find({"username": {"$regex": q, "$options": "i"}}).limit(10))
    return [{"username": u["username"], "name": u.get("name", ""), "avatar_url": u.get("avatar_url", "")} for u in users]


# 👉 Like Post
@app.post("/like_post/{post_id}")
def like_post(post_id: int):
    db.posts.update_one({"id": post_id}, {"$inc": {"likes": 1}})
    return {"message": "Liked"}


# 👉 Add Comment
@app.post("/comment/{post_id}")
def add_comment(post_id: int, comment: CommentCreate):
    post = db.posts.find_one({"id": post_id})
    if post:
        if post.get("comments", ""):
            new_comments = post["comments"] + "||" + comment.comment
        else:
            new_comments = comment.comment
        db.posts.update_one({"id": post_id}, {"$set": {"comments": new_comments}})
    return {"message": "Comment added"}


# 👉 Delete Post (optional)
@app.delete("/delete_post/{post_id}")
def delete_post(post_id: int):
    db.posts.delete_one({"id": post_id})
    return {"message": "Post deleted"}


# 👉 AUTHENTICATION & LOGIN LOGS
@app.post("/register")
def register(user: UserAuth):
    existing = db.users.find_one({"username": user.username})
    if existing:
        return {"error": "Username already exists"}
    
    hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_user = {
        "name": user.name or user.username,
        "username": user.username,
        "password_hash": hashed_pw,
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80",
        "join_date": datetime.now().strftime("%Y-%m-%d")
    }
    db.users.insert_one(new_user)
    return {"message": "User registered successfully"}

@app.post("/login")
def login(user: UserAuth):
    db_user = db.users.find_one({"username": user.username})
    
    if not db_user or not bcrypt.checkpw(user.password.encode("utf-8"), db_user.get("password_hash", "").encode("utf-8")):
        return {"error": "Invalid username or password"}
        
    stored_username = db_user["username"]
    
    log_id = get_next_sequence_value("log_id")
    log = {"id": log_id, "username": stored_username, "login_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
    db.login_logs.insert_one(log)
    return {"message": "Login successful", "username": stored_username}

@app.get("/admin/export_logins")
def export_logins():
    logs = list(db.login_logs.find().sort("id", -1))
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Username", "Login Time"])
    for log in logs:
        writer.writerow([log.get("id", ""), log.get("username", ""), log.get("login_time", "")])
        
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=login_logs.csv"})

# 👉 Get User Profile
@app.get("/user_profile")
def get_user_profile(username: str = None):
    if username:
        user = db.users.find_one({"username": username})
    else:
        user = db.users.find_one()
    
    if user:
        return {
            "name": user.get("name", ""),
            "username": user.get("username", ""),
            "avatar_url": user.get("avatar_url", ""),
            "join_date": user.get("join_date", "")
        }
    return {"error": "User not found"}


# 👉 TIMETABLE ROUTES
@app.get("/get_timetable")
def get_timetable(username: str):
    items = list(db.timetable_allocations.find({"username": username}))
    
    if not items:
        return {} # Empty dict means no timetable generated yet
        
    return {item["category"]: {"hours": item.get("hours", 0), "completed": item.get("completed", False)} for item in items}

@app.post("/save_timetable")
def save_timetable(req: TimetableSaveRequest):
    db.timetable_allocations.delete_many({"username": req.username})

    new_items = []
    for category, val in req.allocations.items():
        hours = val["hours"] if isinstance(val, dict) else val
        completed = val["completed"] if isinstance(val, dict) else False

        new_items.append({
            "username": req.username,
            "category": category,
            "hours": hours,
            "completed": completed
        })
    if new_items:
        db.timetable_allocations.insert_many(new_items)
    return {"message": "Timetable saved successfully"}

@app.post("/toggle_allocation/{category}")
def toggle_allocation(category: str, username: str):
    item = db.timetable_allocations.find_one({"username": username, "category": category})
    
    if item:
        new_status = not item.get("completed", False)
        db.timetable_allocations.update_one(
            {"_id": item["_id"]},
            {"$set": {"completed": new_status}}
        )
        return {"message": "Toggled", "completed": new_status}
    return {"message": "Not Found", "completed": False}


# 👉 Get Latest Metrics
@app.get("/get_metrics")
def get_metrics():
    try:
        try:
            metric = db.stress_metrics.find_one({"_id": "current_session"})
            if metric:
                metric.pop("_id", None)
                if "timestamp" in metric:
                    metric.pop("timestamp", None)
                return metric
        except Exception:
            pass

        if os.path.exists("metrics.json"):
            with open("metrics.json", "r") as f:
                return json.load(f)
        return {"stress": 0, "fatigue": 0, "focus": 0, "posture": "UNKNOWN", "task": "-", "score": 0}
    except Exception as e:
        return {"error": str(e)}

# -------------------------
# WEBCAM AI STREAM (MediaPipe/OpenCV)
# -------------------------

def generate_frames():
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)
    LEFT_EYE = [33,160,158,133,153,144]
    RIGHT_EYE = [362,385,387,263,373,380]
    EAR_THRESHOLD = 0.23
    
    blink_count = 0
    closed_frames = 0
    total_frames = 0
    start_time = time.time()
    heatmap = None
    
    cap = cv2.VideoCapture(0)
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            frame = cv2.flip(frame, 1)
            total_frames += 1
            
            if heatmap is None:
                heatmap = np.zeros_like(frame[:,:,0]).astype(float)
                
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb)
            
            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    h, w, _ = frame.shape
                    left_eye = []
                    right_eye = []
                    
                    for id in LEFT_EYE:
                        x = int(face_landmarks.landmark[id].x * w)
                        y = int(face_landmarks.landmark[id].y * h)
                        left_eye.append([x,y])
                        if y < h and x < w:
                            heatmap[y,x] += 1
                            
                    for id in RIGHT_EYE:
                        x = int(face_landmarks.landmark[id].x * w)
                        y = int(face_landmarks.landmark[id].y * h)
                        right_eye.append([x,y])
                        if y < h and x < w:
                            heatmap[y,x] += 1
                            
                    def eye_aspect_ratio(eye):
                        A = np.linalg.norm(eye[1] - eye[5])
                        B = np.linalg.norm(eye[2] - eye[4])
                        C = np.linalg.norm(eye[0] - eye[3])
                        return (A + B) / (2.0 * C) if C != 0 else 0
                        
                    left_eye = np.array(left_eye)
                    right_eye = np.array(right_eye)
                    leftEAR = eye_aspect_ratio(left_eye)
                    rightEAR = eye_aspect_ratio(right_eye)
                    ear = (leftEAR + rightEAR) / 2
                    
                    if ear < EAR_THRESHOLD:
                        closed_frames += 1
                    else:
                        if closed_frames > 2:
                            blink_count += 1
                        closed_frames = 0
                        
                    if closed_frames > 15:
                        cv2.putText(frame, "FATIGUE ALERT", (40,120), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,0,255), 3)
                        
            elapsed_time = time.time() - start_time
            blink_rate = blink_count / (elapsed_time/60 + 0.001)
            fatigue_score = min(100, closed_frames*2 + blink_rate*0.5)
            stress_score = max(0, 100 - blink_rate*2)
            focus_level = max(0, 100 - fatigue_score)
            
            cv2.putText(frame, f"Blinks: {blink_count}", (20,40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)
            cv2.putText(frame, f"Blink Rate/min: {int(blink_rate)}", (20,70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,0), 2)
            cv2.putText(frame, f"Fatigue Score: {int(fatigue_score)}", (20,100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,165,255), 2)
            cv2.putText(frame, f"Stress Score: {int(stress_score)}", (20,130), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,0,255), 2)
            cv2.putText(frame, f"Focus Level: {int(focus_level)}", (20,160), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,255), 2)
            
            # Write localized metrics.json so the Dashboard dashboard reads real data safely
            try:
                data_dict = {
                    "stress": int(stress_score),
                    "fatigue": int(fatigue_score),
                    "focus": int(focus_level),
                    "score": int(focus_level * 0.8 + (100 - stress_score) * 0.2)
                }
                with open("metrics.json", "w") as f:
                    json.dump(data_dict, f)
                try:
                    db.stress_metrics.update_one(
                        {"_id": "current_session"},
                        {"$set": {**data_dict, "timestamp": datetime.now().isoformat()}},
                        upsert=True
                    )
                except Exception:
                    pass
            except Exception:
                pass

            heatmap_display = cv2.normalize(heatmap, None, 0, 255, cv2.NORM_MINMAX)
            heatmap_display = heatmap_display.astype(np.uint8)
            heatmap_display = cv2.applyColorMap(heatmap_display, cv2.COLORMAP_JET)
            
            overlay = cv2.addWeighted(frame, 0.7, heatmap_display, 0.3, 0)
            
            ret, buffer = cv2.imencode('.jpg', overlay)
            if not ret:
                continue
                
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        cap.release()

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

# -------------------------
# 10-SECOND POPUP SCAN (Requested feature)
# -------------------------
@app.post("/run_scan")
def run_scan():
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

    LEFT_EYE = [33,160,158,133,153,144]
    RIGHT_EYE = [362,385,387,263,373,380]

    EAR_THRESHOLD = 0.23

    blink_count = 0
    closed_frames = 0
    total_frames = 0

    start_time = time.time()
    heatmap = None

    def eye_aspect_ratio(eye):
        A = np.linalg.norm(eye[1] - eye[5])
        B = np.linalg.norm(eye[2] - eye[4])
        C = np.linalg.norm(eye[0] - eye[3])
        if C == 0:
            return 0
        return (A + B) / (2.0 * C)

    cap = cv2.VideoCapture(0)
    
    # Initialize variables to safe defaults in case camera fails
    fatigue_score = 0
    stress_score = 0
    focus_level = 0
    
    # Use cv2.imshow which was requested in the original code
    window_name = "AI Wellness Monitor"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    # Bring window to front
    cv2.setWindowProperty(window_name, cv2.WND_PROP_TOPMOST, 1)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        total_frames += 1

        if heatmap is None:
            heatmap = np.zeros_like(frame[:,:,0]).astype(float)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)

        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                h, w, _ = frame.shape
                left_eye = []
                right_eye = []

                for id in LEFT_EYE:
                    x = int(face_landmarks.landmark[id].x * w)
                    y = int(face_landmarks.landmark[id].y * h)
                    left_eye.append([x,y])
                    if y < h and x < w:
                        heatmap[y,x] += 1

                for id in RIGHT_EYE:
                    x = int(face_landmarks.landmark[id].x * w)
                    y = int(face_landmarks.landmark[id].y * h)
                    right_eye.append([x,y])
                    if y < h and x < w:
                        heatmap[y,x] += 1

                left_eye = np.array(left_eye)
                right_eye = np.array(right_eye)

                leftEAR = eye_aspect_ratio(left_eye)
                rightEAR = eye_aspect_ratio(right_eye)

                ear = (leftEAR + rightEAR) / 2

                if ear < EAR_THRESHOLD:
                    closed_frames += 1
                else:
                    if closed_frames > 2:
                        blink_count += 1
                    closed_frames = 0

                if closed_frames > 15:
                    cv2.putText(frame, "FATIGUE ALERT", (40,120),
                                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,0,255), 3)

        elapsed_time = time.time() - start_time
        blink_rate = blink_count / (elapsed_time/60 + 0.001)

        fatigue_score = min(100, closed_frames*2 + blink_rate*0.5)
        stress_score = max(0, 100 - blink_rate*2)
        focus_level = max(0, 100 - fatigue_score)

        cv2.putText(frame, f"Blinks: {blink_count}", (20,40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)
        cv2.putText(frame, f"Blink Rate/min: {int(blink_rate)}", (20,70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,0), 2)
        cv2.putText(frame, f"Fatigue Score: {int(fatigue_score)}", (20,100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,165,255), 2)
        cv2.putText(frame, f"Stress Score: {int(stress_score)}", (20,130),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,0,255), 2)
        cv2.putText(frame, f"Focus Level: {int(focus_level)}", (20,160),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,255), 2)

        heatmap_display = cv2.normalize(heatmap, None, 0, 255, cv2.NORM_MINMAX)
        heatmap_display = heatmap_display.astype(np.uint8)
        heatmap_display = cv2.applyColorMap(heatmap_display, cv2.COLORMAP_JET)

        overlay = cv2.addWeighted(frame, 0.7, heatmap_display, 0.3, 0)

        # Draw a beautiful countdown timer on top right
        remaining_time = max(0, 10 - int(elapsed_time))
        cv2.putText(overlay, f"{remaining_time}s", (overlay.shape[1] - 80, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3)

        # Show the popup window and process UI events
        cv2.imshow(window_name, overlay)
        if cv2.waitKey(1) & 0xFF == 27:
            break

        # Stop after 10 seconds automatically
        if elapsed_time >= 10:
            break

    cap.release()
    try:
        cv2.destroyWindow(window_name)
    except cv2.error:
        pass
    
    # Save the updated metrics
    try:
        score = int(focus_level * 0.8 + (100 - stress_score) * 0.2)
        data_dict = {
            "stress": int(stress_score),
            "fatigue": int(fatigue_score),
            "focus": int(focus_level),
            "score": score
        }
        with open("metrics.json", "w") as f:
            json.dump(data_dict, f)
            
        try:
            db.stress_metrics.update_one(
                {"_id": "current_session"},
                {"$set": {**data_dict, "timestamp": datetime.now().isoformat()}},
                upsert=True
            )
            db.stress_history.insert_one({
                **data_dict,
                "timestamp": datetime.now().isoformat(),
                "type": "manual_scan"
            })
        except Exception:
            pass
    except Exception as e:
        pass
        
    return {"message": "Scan completed successfully"}

# -------------------------
# CHATBOT LOGIC
# -------------------------
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from pydantic import BaseModel

# INTENTS
INTENTS = {
    'greeting':     ['hello', 'hi', 'hey', 'good morning', 'good evening', 'howdy'],
    'farewell':     ['bye', 'goodbye', 'see you', 'take care', 'exit'],
    'fatigue':      ['tired', 'exhausted', 'fatigue', 'drained', 'no energy', 'sleepy', 'lethargic'],
    'sleep':        ['sleep', 'insomnia', 'cant sleep', "can't sleep", 'wake up', 'restless', 'sleepless'],
    'anxiety':      ['anxious', 'anxiety', 'nervous', 'panic', 'worry', 'worried', 'stress', 'tense'],
    'depression':   ['depressed', 'sad', 'hopeless', 'worthless', 'empty', 'numb', 'miserable'],
    'burnout':      ['burnout', 'burnt out', 'overwhelmed', 'overworked', 'exhausted mentally'],
    'nutrition':    ['eat', 'food', 'diet', 'nutrition', 'vitamin', 'meal', 'hungry', 'water'],
    'activity':     ['exercise', 'walk', 'gym', 'workout', 'physical', 'movement', 'stretch'],
    'crisis':       ['suicide', 'kill myself', 'end my life', 'want to die', 'hurt myself', 'self harm'],
    'happy':        ['happy', 'good', 'great', 'okay', 'fine', 'well', 'better', 'amazing'],
    'paranoia':     ['paranoid', 'suspicious', 'distrust', 'conspiracy'],
    'phq':          ['phq', 'quiz', 'assessment', 'test', 'evaluate', 'diagnose'],
    'breathing':    ['breathe', 'breathing', 'calm', 'relax', 'meditation'],
    'sunlight':     ['sunlight', 'sun', 'outside', 'outdoor', 'vitamin d'],
    'fitbit':       ['my data', 'steps', 'calories', 'how am i doing', 'activity summary'],
}

RESPONSES = {
    'greeting': [
        "Hello! I'm MindGuard, your mental wellness companion. How are you feeling today?",
        "Hi there! I'm here to help with fatigue, sleep, anxiety, nutrition and more. What's on your mind?",
    ],
    'farewell': [
        "Take care of yourself! Remember — your mental health matters. Come back anytime. 💙",
        "Goodbye! Remember to rest, hydrate, and be kind to yourself. 🌟",
    ],
    'happy': [
        "That's wonderful to hear! Keep maintaining those healthy habits. Is there anything specific I can help you improve?",
        "Great! Positive mood is a sign your wellness practices are working. How can I support you further?",
    ],
    'crisis': (
        "I'm genuinely concerned about what you shared. You are not alone and your life matters deeply. "
        "Please reach out immediately:\n"
        "🆘 iCall: 9152987821\n"
        "🆘 Vandrevala Foundation: 1860-2662-345 (24/7)\n"
        "🆘 AASRA: 9820466627\n\n"
        "I'm here with you. Would you like to talk about what's going on?"
    ),
    'default': [
        "I'm here to help with fatigue, sleep, anxiety, nutrition, burnout, and mental health assessment. What would you like to explore?",
        "I didn't quite catch that. Could you tell me more about how you're feeling? I'm here to listen.",
    ]
}

def calculate_fatigue_score_bot(sleep_hours, work_hours, stress_level, activity_level):
    sleep_score = max(0, (8 - sleep_hours) * 10)
    work_score = min(40, max(0, (work_hours - 6) * 5))
    stress_score = (stress_level / 10) * 25
    activity_relief = {0: 0, 1: -5, 2: -10, 3: -15}
    activity_score = activity_relief.get(activity_level, 0)
    total = sleep_score + work_score + stress_score + activity_score
    return max(0, min(100, int(total)))

def get_fatigue_level(score):
    if   score <= 30: return 'Low',    'green',  '✅'
    elif score <= 60: return 'Medium', 'amber',  '⚠️'
    else:             return 'High',   'red',    '🚨'

def get_fatigue_advice(score):
    if score <= 30:
        return {'summary': 'You are managing your energy well!', 'tips': ['Maintain sleep schedule', 'Stay hydrated', 'Light activity', 'Check in weekly to track trends']}
    elif score <= 60:
        return {'summary': 'Moderate fatigue detected. Take action now.', 'tips': ['Aim for 7-8 hours of sleep tonight', 'Take a 5-minute break every 45 minutes', 'Try the box breathing exercise']}
    else:
        return {'summary': 'High fatigue detected. Immediate action needed.', 'tips': ['Stop non-essential tasks today', 'Prioritize sleep \u2014 aim for 9 hours tonight', 'Consider speaking to a doctor if this persists']}

def detect_burnout(work_hours_per_week, stress_level, fatigue_score, days_without_break):
    score = 0
    if work_hours_per_week >= 50: score += 30
    elif work_hours_per_week >= 40: score += 15
    if stress_level >= 8: score += 25
    elif stress_level >= 6: score += 12
    if fatigue_score >= 70: score += 25
    elif fatigue_score >= 50: score += 12
    if days_without_break >= 14: score += 20
    elif days_without_break >= 7: score += 10
    if   score >= 70: return 'High Risk', score
    elif score >= 40: return 'Moderate Risk', score
    else:             return 'Low Risk', score

def interpret_phq(total_score):
    if   total_score <= 4:  return 'Minimal', 'Minimal symptoms. Keep monitoring.'
    elif total_score <= 9:  return 'Mild', 'Mild symptoms. Consider self-care.'
    elif total_score <= 14: return 'Moderate', 'Moderate symptoms. Consider speaking to a counselor.'
    elif total_score <= 19: return 'Moderately Severe', 'Significant symptoms. Please consult a professional.'
    else:                   return 'Severe', 'Severe symptoms. Please seek professional help immediately.'

def detect_intent(message):
    msg = message.lower()
    for keyword in INTENTS['crisis']:
        if keyword in msg: return 'crisis'
    for intent, keywords in INTENTS.items():
        if intent == 'crisis': continue
        for keyword in keywords:
            if keyword in msg: return intent
    return 'default'

def detect_emotion(message):
    msg = message.lower()
    negative = ['tired','sad','anxious','stressed','bad','depressed','worried','scared','miserable']
    positive = ['good','great','happy','okay','fine','well','excited','amazing']
    neg_count = sum(1 for w in negative if w in msg)
    pos_count = sum(1 for w in positive if w in msg)
    if neg_count > pos_count: return 'negative', neg_count
    elif pos_count > neg_count: return 'positive', pos_count
    else: return 'neutral', 0

ml_model = None
ml_vectorizer = None
ml_encoder = None

def load_ml_model():
    global ml_model, ml_vectorizer, ml_encoder
    # Load Fitbit Data for Chatbot Context
    try:
        data_dir = "chatbot/Fitabase Data 4.12.16-5.12.16"
        if os.path.exists(data_dir):
            activity_file = os.path.join(data_dir, "dailyActivity_merged.csv")
            if os.path.exists(activity_file):
                df = pd.read_csv(activity_file)
                latest_activity = df.iloc[-1].to_dict()
                app.state.latest_steps = int(latest_activity.get("TotalSteps", 0))
                app.state.latest_calories = int(latest_activity.get("Calories", 0))
            
            sleep_file = os.path.join(data_dir, "sleepDay_merged.csv")
            if os.path.exists(sleep_file):
                df_sleep = pd.read_csv(sleep_file)
                latest_sleep = df_sleep.iloc[-1].to_dict()
                app.state.latest_sleep = float(latest_sleep.get("TotalMinutesAsleep", 0)) / 60.0
        else:
            app.state.latest_steps = 0
            app.state.latest_calories = 0
            app.state.latest_sleep = 0
    except:
        app.state.latest_steps = 0
        app.state.latest_calories = 0
        app.state.latest_sleep = 0

    try:
        if os.path.exists('temp_repo/emotion.csv'):
            data = pd.read_csv('temp_repo/emotion.csv')
            if 'label' in data.columns: data = data.rename(columns={'label': 'emotions'})
            data = data.dropna(subset=['text', 'emotions'])
            X_train, X_test, y_train, y_test = train_test_split(data['text'], data['emotions'], test_size=0.2, random_state=42)
            ml_vectorizer = TfidfVectorizer(max_df=0.9, min_df=2)
            X_train_vec = ml_vectorizer.fit_transform(X_train)
            ml_encoder = LabelEncoder()
            y_train_enc = ml_encoder.fit_transform(y_train)
            ml_model = LogisticRegression(C=0.1, class_weight='balanced', max_iter=500)
            ml_model.fit(X_train_vec, y_train_enc)
    except Exception as e:
        pass

load_ml_model()

def predict_emotion_ml(text):
    if ml_model and ml_vectorizer and ml_encoder:
        try:
            vec = ml_vectorizer.transform([text])
            pred = ml_model.predict(vec)[0]
            proba = ml_model.predict_proba(vec)[0].max()
            label = ml_encoder.inverse_transform([pred])[0]
            return label, float(proba)
        except:
            pass
    emotion, score = detect_emotion(text)
    return emotion, score / 10.0

class ChatRequest(BaseModel):
    message: str = ""
    user_name: str = "friend"
    age: int = 25
    context: dict = {}

@app.post('/chat')
async def obj_chat(data: ChatRequest):
    import random
    message = data.message
    name = data.user_name
    intent = detect_intent(message)
    emotion, conf = predict_emotion_ml(message)
    response = ''
    quick_replies = []

    if intent == 'crisis':
        response = RESPONSES['crisis']
        quick_replies = ["I want to talk", "I'm okay, just venting"]
    elif intent == 'greeting':
        response = random.choice(RESPONSES['greeting'])
        quick_replies = ["I feel tired", "I'm stressed", "Sleep issues", "Nutrition advice"]
    elif intent == 'farewell':
        response = random.choice(RESPONSES['farewell'])
    elif intent == 'happy':
        response = random.choice(RESPONSES['happy'])
        quick_replies = ["Fatigue assessment", "Nutrition tips", "PHQ-9 quiz"]
    elif intent == 'fatigue':
        response = f"I understand you're feeling drained, {name}. How many hours did you sleep last night?"
        quick_replies = ["Less than 5 hours", "6-7 hours", "8+ hours", "Calculate fatigue score"]
    elif intent == 'sleep':
        response = f"Sleep issues can really impact everything, {name}. How many hours of sleep are you currently getting?"
        quick_replies = ["Less than 5 hours", "5-6 hours", "I keep waking up", "Breathing exercise"]
    elif intent == 'anxiety':
        response = f"Anxiety is very manageable, {name}. Let's do Box Breathing: Inhale 4 sec, Hold 4 sec, Exhale 4 sec. How long have you been feeling anxious?"
        quick_replies = ["Start breathing exercise", "Chronic anxiety", "Exam stress", "Work stress"]
    elif intent == 'fitbit':
        steps = getattr(app.state, 'latest_steps', 0)
        cals = getattr(app.state, 'latest_calories', 0)
        sleep = getattr(app.state, 'latest_sleep', 0)
        response = f"Sure! Based on your synced wearable data: You took {steps:,} steps today and burned {cals:,} calories. You slept for {sleep:.1f} hours last night."
        if steps < 5000:
            response += " You're a bit inactive today—maybe take a light walk?"
        elif sleep < 6:
            response += " You seem sleep-deprived. Try to get more rest tonight."
        else:
            response += " You're doing great! Keep up the healthy habits."
        quick_replies = ["Nutrition tips", "Activity advice", "Fatigue assessment"]
    elif intent == 'phq':
        response = "Starting PHQ-9 Mental Health Assessment. Question 1: Little interest or pleasure in doing things?"
        quick_replies = ["A. Not at all", "B. Several days", "C. More than half", "D. Nearly every day"]
    else:
        response = random.choice(RESPONSES['default'])
        quick_replies = ["Fatigue assessment", "Sleep help", "Anxiety relief", "Nutrition advice", "PHQ-9 quiz"]

    try:
        db.chat_history.insert_one({
            "username": name,
            "user_message": message,
            "bot_response": response,
            "intent": intent,
            "emotion": emotion,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        print("Chat log to MongoDB failed:", e)

    return {
        'response': response,
        'intent': intent,
        'emotion': emotion,
        'confidence': round(conf, 2),
        'quick_replies': quick_replies,
        'user_name': name
    }

class FatigueReq(BaseModel):
    sleep_hours: float = 6
    work_hours: float = 8
    stress_level: int = 5
    activity_level: int = 1
    user_name: str = "friend"

@app.post('/fatigue')
async def fatigue_score(data: FatigueReq):
    score = calculate_fatigue_score_bot(data.sleep_hours, data.work_hours, data.stress_level, data.activity_level)
    level, color, emoji = get_fatigue_level(score)
    advice = get_fatigue_advice(score)
    return {
        'score': score, 'level': level, 'color': color, 'emoji': emoji, 'advice': advice,
        'user_name': data.user_name, 'message': f"{emoji} {data.user_name}, your fatigue score is {score}/100 ({level}). {advice['summary']}"
    }

class BurnoutReq(BaseModel):
    work_hours_per_week: int = 40
    stress_level: int = 5
    fatigue_score: int = 50
    days_without_break: int = 7

@app.post('/burnout')
async def burnout_check(data: BurnoutReq):
    level, score = detect_burnout(data.work_hours_per_week, data.stress_level, data.fatigue_score, data.days_without_break)
    return {'burnout_level': level, 'risk_score': score, 'recommendations': ["Take a day off this week", "Reduce work hours"]}

class PhqReq(BaseModel):
    answers: list[int] = []

@app.post('/phq')
async def phq_score(data: PhqReq):
    total = sum(data.answers)
    level, advice = interpret_phq(total)
    return {'total': total, 'level': level, 'advice': advice, 'seek_help': total >= 10}

@app.get('/crisis_resources')
async def crisis_resources():
    return {'helplines': [{'name': 'iCall', 'number': '9152987821', 'hours': 'Mon-Sat 8am-10pm'}, {'name': 'Vandrevala Foundation', 'number': '1860-2662-345', 'hours': '24/7'}], 'message': 'You are not alone. These services are free and confidential.'}
