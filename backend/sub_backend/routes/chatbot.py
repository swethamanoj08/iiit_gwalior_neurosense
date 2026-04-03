from flask import Blueprint, request, jsonify

chatbot_bp = Blueprint("chatbot", **name**)

@chatbot_bp.route("/chat", methods=["POST"])
def chat():

```
data = request.json
message = data.get("message")

return jsonify({
    "reply": "Chatbot working! You said: " + message
})
```
