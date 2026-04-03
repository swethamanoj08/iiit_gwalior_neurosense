import requests

url = "http://localhost:5000/api/chat"
data = {"message": "hello", "user_name": "TestUser"}

try:
    print(f"Sending POST to {url}...")
    response = requests.post(url, json=data, timeout=5)
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error connecting to chatbot:", e)
