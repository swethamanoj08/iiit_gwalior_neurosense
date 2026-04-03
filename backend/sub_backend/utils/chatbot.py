from utils.sentiment import analyze_sentiment


def chatbot_response(message):

    sentiment, score = analyze_sentiment(message)

    if sentiment == "NEGATIVE":
        reply = "You sound stressed. Try taking a deep breath or a short break."

    elif sentiment == "POSITIVE":
        reply = "That's great! Keep going!"

    else:
        reply = "Tell me more about how you're feeling."

    return {
        "sentiment": sentiment,
        "confidence": score,
        "reply": reply
    }