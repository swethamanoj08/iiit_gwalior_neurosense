"""Seed script: populates MongoDB with demo users, posts, and stories for NeuroGram."""
import certifi
import urllib.parse
import pymongo
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL, tlsCAFile=certifi.where())
db = client.chatbotDB

def get_next_sequence_value(sequence_name, amount=1):
    sequence_doc = db.counters.find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"sequence_value": amount}},
        upsert=True,
        return_document=pymongo.ReturnDocument.AFTER
    )
    return sequence_doc["sequence_value"]

DEMO_USERS = [
    {"username": "admin",     "name": "Alex Chen",    "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"},
    {"username": "priya_fit", "name": "Priya Sharma", "avatar_url": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200"},
    {"username": "rajiv_run", "name": "Rajiv Kumar",  "avatar_url": "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=200"},
    {"username": "meera_yoga","name": "Meera Nair",   "avatar_url": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200"},
    {"username": "arjun_zen", "name": "Arjun Patel",  "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200"},
]

DEMO_POSTS = [
    {
        "username": "priya_fit",
        "content": "🏃‍♀️ Just crushed 8km run this morning! NeuroSense wellness score: 92/100 today. Feeling unstoppable! #NeuroFit #WellnessGoals",
        "image_url": "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800",
    },
    {
        "username": "rajiv_run",
        "content": "💪 Day 30 of my wellness journey with NeuroSense. Steps: 12,400 | Calories: 2,850. The AI coaching is 🔥 #NeuroGram",
        "image_url": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800",
    },
    {
        "username": "meera_yoga",
        "content": "🧘‍♀️ Morning yoga session complete. Eye Tracker shows 95% focus score — meditation really works! Try the MindScan feature. 🌅",
        "image_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
    },
    {
        "username": "arjun_zen",
        "content": "🌿 Stress levels down 40% this week thanks to NeuroSense AI monitoring. Sleep improved from 5hrs → 7.5hrs avg. Science-backed wellness FTW!",
        "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    },
    {
        "username": "priya_fit",
        "content": "🔥 New personal best: 15,000 steps in a day! NeuroGram community keeps me accountable. Who else hit their goal today? 💪 #NeuroCommunity",
        "image_url": "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800",
    },
    {
        "username": "admin",
        "content": "🚀 Welcome to NeuroGram — where your wellness journey becomes a community experience! Share your progress, inspire others. #NeuroSense",
        "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
    },
]

DEMO_STORIES = [
    {"username": "priya_fit",  "image_url": "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=300"},
    {"username": "rajiv_run",  "image_url": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300"},
    {"username": "meera_yoga", "image_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300"},
    {"username": "arjun_zen",  "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300"},
    {"username": "admin",      "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300"},
]

print("🌱 Seeding NeuroGram demo data...")

# 1. Upsert users
for user in DEMO_USERS:
    existing = db.users.find_one({"username": user["username"]})
    if not existing:
        hashed_pw = bcrypt.hashpw("demo123".encode(), bcrypt.gensalt()).decode()
        db.users.insert_one({**user, "password_hash": hashed_pw, "join_date": "2025-01-01"})
        print(f"  ✅ Created user: {user['username']}")
    else:
        # Update avatar if missing
        db.users.update_one({"username": user["username"]}, {"$set": {"avatar_url": user["avatar_url"], "name": user["name"]}})
        print(f"  🔄 Updated user: {user['username']}")

# 2. Clear old posts & stories to avoid duplicates
db.posts.delete_many({})
db.stories.delete_many({})
db.counters.delete_many({"_id": {"$in": ["post_id", "story_id"]}})
print("  🗑️  Cleared old posts and stories")

# 3. Insert posts
for i, post in enumerate(DEMO_POSTS):
    post_id = get_next_sequence_value("post_id")
    db.posts.insert_one({
        "id": post_id,
        "username": post["username"],
        "content": post["content"],
        "image_url": post.get("image_url", ""),
        "likes": [3, 7, 12, 5, 9, 4][i % 6],
        "comments": "Incredible progress!||Keep it up! 🔥||So inspiring!"
    })
    print(f"  📝 Post #{post_id}: @{post['username']}")

# 4. Insert stories
for story in DEMO_STORIES:
    story_id = get_next_sequence_value("story_id")
    db.stories.insert_one({
        "id": story_id,
        "username": story["username"],
        "image_url": story["image_url"],
        "created_at": datetime.now().isoformat()
    })
    print(f"  📸 Story for @{story['username']}")

# 5. Seed follows (admin follows everyone)
db.follows.delete_many({"follower_username": "admin"})
for user in DEMO_USERS:
    if user["username"] != "admin":
        db.follows.insert_one({"follower_username": "admin", "followed_username": user["username"]})
        # Mutual follow: user follows admin back
        db.follows.insert_one({"follower_username": user["username"], "followed_username": "admin"})
        print(f"  👥 Mutual follow: admin <-> {user['username']}")

print("\n✅ NeuroGram seed complete! Feed is ready to display.")
