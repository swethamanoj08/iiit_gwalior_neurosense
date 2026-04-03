from transformers import pipeline

# Load sentiment model
sentiment_model = pipeline("sentiment-analysis")

def analyze_sentiment(text):

    result = sentiment_model(text)[0]

    label = result['label']
    score = result['score']

    return label, score