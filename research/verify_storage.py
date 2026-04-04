import requests
import os

print("--- TESTING LOCAL API 8002 ---")
try:
    # 1. Test Hello
    r0 = requests.get("http://127.0.0.1:8002/")
    print(f"✅ Root endpoint: {r0.json()}")

    # 2. Test Get Posts
    r1 = requests.get("http://127.0.0.1:8002/get_posts?username=admin")
    print(f"✅ Get Posts count: {len(r1.json())}")

    # 3. Test Create Post
    payload = {
        "username": "admin",
        "content": "Automated Connection Test Post",
        "image_url": "https://hacksagonimages.s3.ap-south-1.amazonaws.com/test_placeholder.png"
    }
    r2 = requests.post("http://127.0.0.1:8002/create_post", json=payload)
    print(f"✅ Create Post Status: {r2.status_code}")
    print(f"✅ Create Post Resp: {r2.text}")

    # 4. Verify MongoDB write
    r3 = requests.get("http://127.0.0.1:8002/get_posts?username=admin")
    found = any(p["content"] == "Automated Connection Test Post" for p in r3.json())
    if found:
        print("✅ MongoDB Write Verified: Post stored successfully.")
    else:
        print("❌ MongoDB Write Failed: Post not found in fetch.")

except Exception as e:
    print(f"❌ Test Failed with error: {e}")
