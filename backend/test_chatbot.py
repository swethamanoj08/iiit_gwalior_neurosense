import requests
import json

def test_chat():
    url = "http://127.0.0.1:8003/chat"
    payload = {
        "message": "I feel very tired today",
        "user_name": "admin"
    }
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_chat()
