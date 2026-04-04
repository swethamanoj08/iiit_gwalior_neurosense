"""
NeuroGram Social Feed Server — port 8002
Handles: posts, stories, follows, likes, comments, users
No cv2 / mediapipe dependency.
"""
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import certifi, urllib.parse, pymongo, bcrypt, os, uuid, boto3
from botocore.exceptions import ClientError, NoCredentialsError
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv

from pathlib import Path
dotenv_path = Path(__file__).parent / ".env"
loaded = load_dotenv(dotenv_path=dotenv_path)
print(f"DEBUG: .env path used: {dotenv_path}")
# S3 Config from Environment
AWS_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
S3_REGION = os.getenv("AWS_REGION")

# DB Config from Environment
DATABASE_URL = os.getenv("MONGO_URL")
client = MongoClient(DATABASE_URL, tlsCAFile=certifi.where())
try:
    client.admin.command('ping')
    print("✅ NeuroGram Feed: MongoDB Atlas connected successfully")
except Exception as e:
    print(f"❌ NeuroGram Feed: MongoDB connection FAILED — {e}")
db = client.chatbotDB


def _next_id(name: str) -> int:
    doc = db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=pymongo.ReturnDocument.AFTER,
    )
    return doc["sequence_value"]


# ── APP ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="NeuroGram Feed API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ── SCHEMAS ───────────────────────────────────────────────────────────────────
class PostCreate(BaseModel):
    username: str
    content: str
    image_url: str = ""


class StoryCreate(BaseModel):
    username: str
    image_url: str


class CommentCreate(BaseModel):
    comment: str


class UserAuth(BaseModel):
    username: str
    password: str
    name: str = ""


# ── HEALTH ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "NeuroGram Feed API ✅", "port": 8002}


# ── POSTS ─────────────────────────────────────────────────────────────────────
@app.post("/upload_image")
def upload_image(file: UploadFile = File(...)):
    filename = f"{uuid.uuid4()}_{file.filename.replace(' ', '_')}"
    try:
        # Create client on demand for maximum reliability in this environment
        s3 = boto3.client(
            's3',
            region_name=S3_REGION,
            aws_access_key_id=AWS_ID,
            aws_secret_access_key=AWS_KEY
        )
        s3.upload_fileobj(
            file.file,
            S3_BUCKET_NAME,
            filename,
            ExtraArgs={'ContentType': file.content_type}
        )
        image_url = f"https://{S3_BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com/{filename}"
        return {"image_url": image_url}
    except Exception as e:
        import traceback
        err_msg = f"{type(e).__name__}: {str(e)}"
        print(f"❌ S3 Upload Error: {err_msg}")
        traceback.print_exc()
        return {"error": "Upload failed", "details": err_msg}

@app.post("/create_post")
def create_post(post: PostCreate):
    post_id = _next_id("post_id")
    db.posts.insert_one({
        "id": post_id,
        "username": post.username,
        "content": post.content,
        "image_url": post.image_url,
        "likes": 0,
        "comments": "",
        "created_at": datetime.now().isoformat(),
    })
    return {"message": "Post created", "post_id": post_id}


@app.get("/get_posts")
def get_posts(username: str = None):
    if username:
        follows = list(db.follows.find({"follower_username": username}))
        allowed = [f["followed_username"] for f in follows] + [username]
        posts = list(db.posts.find({"username": {"$in": allowed}}).sort("id", -1))
    else:
        posts = list(db.posts.find().sort("id", -1))

    usernames = list({p["username"] for p in posts})
    users = list(db.users.find({"username": {"$in": usernames}}))
    avatar = {u["username"]: u.get("avatar_url", "") for u in users}

    return [
        {
            "id": p["id"],
            "username": p["username"],
            "avatar_url": avatar.get(p["username"], ""),
            "content": p["content"],
            "image_url": p.get("image_url", ""),
            "likes": p.get("likes", 0),
            "comments": (
                p.get("comments", "").split("||")
                if p.get("comments", "")
                else []
            ),
            "created_at": p.get("created_at", ""),
        }
        for p in posts
    ]


@app.post("/like_post/{post_id}")
def like_post(post_id: int):
    db.posts.update_one({"id": post_id}, {"$inc": {"likes": 1}})
    return {"message": "Liked"}


@app.post("/comment/{post_id}")
def add_comment(post_id: int, body: CommentCreate):
    post = db.posts.find_one({"id": post_id})
    if post:
        existing = post.get("comments", "")
        new = existing + ("||" if existing else "") + body.comment
        db.posts.update_one({"id": post_id}, {"$set": {"comments": new}})
    return {"message": "Comment added"}


@app.delete("/delete_post/{post_id}")
def delete_post(post_id: int):
    db.posts.delete_one({"id": post_id})
    return {"message": "Post deleted"}


# ── STORIES ───────────────────────────────────────────────────────────────────
@app.post("/create_story")
def create_story(story: StoryCreate):
    story_id = _next_id("story_id")
    db.stories.insert_one({
        "id": story_id,
        "username": story.username,
        "image_url": story.image_url,
        "created_at": datetime.now().isoformat(),
    })
    return {"message": "Story added"}


@app.get("/get_stories")
def get_stories(username: str = None):
    if username:
        follows = list(db.follows.find({"follower_username": username}))
        following_usernames = [f["followed_username"] for f in follows]
        following_usernames.append(username)
        stories = list(db.stories.find({"username": {"$in": following_usernames}}).sort("id", -1).limit(30))
    else:
        stories = list(db.stories.find().sort("id", -1).limit(30))
    usernames = list({s["username"] for s in stories})
    users = list(db.users.find({"username": {"$in": usernames}}))
    avatar = {u["username"]: u.get("avatar_url", "") for u in users}
    return [
        {
            "id": s["id"],
            "username": s["username"],
            "image_url": s["image_url"],
            "avatar_url": avatar.get(s["username"], ""),
        }
        for s in stories
    ]


# ── USERS / FOLLOW ────────────────────────────────────────────────────────────
@app.get("/get_all_users")
def get_all_users():
    users = list(db.users.find().limit(20))
    return [
        {"username": u["username"], "name": u.get("name", ""), "avatar_url": u.get("avatar_url", "")}
        for u in users
    ]


@app.get("/search_users")
def search_users(q: str = ""):
    users = list(db.users.find({"username": {"$regex": q, "$options": "i"}}).limit(10))
    return [
        {"username": u["username"], "name": u.get("name", ""), "avatar_url": u.get("avatar_url", "")}
        for u in users
    ]


@app.get("/get_following/{username}")
def get_following(username: str):
    follows = list(db.follows.find({"follower_username": username}))
    return [f["followed_username"] for f in follows]


@app.get("/get_followers/{username}")
def get_followers(username: str):
    follows = list(db.follows.find({"followed_username": username}))
    return [f["follower_username"] for f in follows]


@app.get("/get_friends/{username}")
def get_friends(username: str):
    # Mutual follows
    following = set(f["followed_username"] for f in db.follows.find({"follower_username": username}))
    followers = set(f["follower_username"] for f in db.follows.find({"followed_username": username}))
    friends = list(following.intersection(followers))
    
    users = list(db.users.find({"username": {"$in": friends}}))
    return [
        {"username": u["username"], "name": u.get("name", ""), "avatar_url": u.get("avatar_url", "")}
        for u in users
    ]


@app.post("/follow/{username}")
def follow_user(username: str, data: dict):
    follower = data.get("username")
    if not follower:
        return {"error": "Missing follower"}
    if not db.follows.find_one({"follower_username": follower, "followed_username": username}):
        db.follows.insert_one({"follower_username": follower, "followed_username": username})
    return {"message": f"Followed {username}"}


@app.post("/unfollow/{username}")
def unfollow_user(username: str, data: dict):
    follower = data.get("username")
    db.follows.delete_one({"follower_username": follower, "followed_username": username})
    return {"message": f"Unfollowed {username}"}


@app.get("/user_profile")
def get_user_profile(username: str = None):
    user = db.users.find_one({"username": username} if username else {})
    if user:
        return {
            "name": user.get("name", ""),
            "username": user.get("username", ""),
            "avatar_url": user.get("avatar_url", ""),
            "join_date": user.get("join_date", ""),
        }
    return {"error": "User not found"}


@app.post("/register")
def register(user: UserAuth):
    if db.users.find_one({"username": user.username}):
        return {"error": "Username already exists"}
    hashed = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()
    db.users.insert_one({
        "name": user.name or user.username,
        "username": user.username,
        "password_hash": hashed,
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        "join_date": datetime.now().strftime("%Y-%m-%d"),
    })
    return {"message": "User registered successfully"}


@app.post("/login")
def login(user: UserAuth):
    db_user = db.users.find_one({"username": user.username})
    if not db_user or not bcrypt.checkpw(
        user.password.encode(), db_user.get("password_hash", "").encode()
    ):
        return {"error": "Invalid username or password"}
    return {"message": "Login successful", "username": db_user["username"]}
