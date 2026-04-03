import os

file_path = "instagram.py"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Instead of relying on exact line numbers, we'll find the start and end of blocks
start_db_setup = -1
end_db_setup = -1
for i, line in enumerate(lines):
    if line.startswith("from sqlalchemy import create_engine"):
        start_db_setup = i
    if line.startswith("seed_user()"):
        end_db_setup = i
        break

start_routes = -1
end_routes = -1
for i, line in enumerate(lines):
    if line.startswith("# 👉 Create Post"):
        start_routes = i
    if line.startswith("# 👉 Get Latest Metrics"):
        end_routes = i - 1
        break

db_setup_code = """import pymongo
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
# -------------------------
DATABASE_URL = "mongodb://localhost:27017"
client = MongoClient(DATABASE_URL)
db = client.wellness_db

def get_next_sequence_value(sequence_name):
    sequence_doc = db.counters.find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=pymongo.ReturnDocument.AFTER
    )
    return sequence_doc["sequence_value"]

def seed_user():
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

seed_user()
"""

routes_code = """# 👉 Create Post
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

# 👉 Get All Posts
@app.get("/get_posts")
def get_posts():
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

"""

if start_db_setup != -1 and end_db_setup != -1 and start_routes != -1 and end_routes != -1:
    new_lines = []
    new_lines.extend(lines[:start_db_setup])
    new_lines.append(db_setup_code)
    
    new_lines.extend(lines[end_db_setup+1:start_routes])
    
    new_lines.append(routes_code)
    new_lines.extend(lines[end_routes:])

    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print("Patch applied successfully.")
else:
    print(f"Error finding block boundaries: DB({start_db_setup}, {end_db_setup}), ROUTES({start_routes}, {end_routes})")
