import requests

data = {
    "message": "What is machine learning?"
}

r = requests.post("http://127.0.0.1:5000/chat", json=data)

print(r.json())