from pymongo import MongoClient
import certifi
import urllib.parse

# ── DB CONFIG ───────────────────────────────────────────────────────────────
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("MONGO_URL")

client = MongoClient(DATABASE_URL, tlsCAFile=certifi.where())
db = client.chatbotDB

def cleanup():
    print("🧹 Cleaning up NeuroGram database...")
    
    # Clear posts
    res_posts = db.posts.delete_many({})
    print(f"✅ Removed {res_posts.deleted_count} posts.")
    
    # Clear stories
    res_stories = db.stories.delete_many({})
    print(f"✅ Removed {res_stories.deleted_count} stories.")
    
    # Reset counters (optional but cleaner)
    db.counters.delete_many({"_id": {"$in": ["post_id", "story_id"]}})
    print("✅ Reset ID counters.")
    
    print("\n✨ Database is now fresh and ready for your real content!")

if __name__ == "__main__":
    cleanup()
