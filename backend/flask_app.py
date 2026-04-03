# ═══════════════════════════════════════════════════════
#  WellBeing360 — MindGuard Chatbot Backend
#  Team: NeuroSense
#  Stack: Flask + Scikit-learn + Pandas
# ═══════════════════════════════════════════════════════

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import re
import os
from pymongo import MongoClient

# MongoDB connection
import certifi
import urllib.parse

password = urllib.parse.quote_plus("g00BqxsW0XXpvyic")
DATABASE_URL = f"mongodb+srv://piyushbhole37_db_user:{password}@cluster0.1ghsmpz.mongodb.net/?appName=Cluster0"
client = MongoClient(DATABASE_URL, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
db = client["chatbotDB"]   # connected to friends DB

# ML imports
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

app = Flask(__name__, static_folder='.')
CORS(app)  # Allow frontend to call this API

# ═══════════════════════════════════════════════════════
#  INTENTS — keyword-based intent detection
# ═══════════════════════════════════════════════════════
INTENTS = {
    'greeting':     ['hello', 'hi', 'hey', 'good morning', 'good evening', 'howdy'],
    'farewell':     ['bye', 'goodbye', 'see you', 'take care', 'exit'],
    'fatigue':      ['tired', 'exhausted', 'fatigue', 'drained', 'no energy', 'sleepy', 'lethargic'],
    'sleep':        ['sleep', 'insomnia', 'cant sleep', "can't sleep", 'wake up', 'restless', 'sleepless'],
    'anxiety':      ['anxious', 'anxiety', 'nervous', 'panic', 'worry', 'worried', 'stress', 'tense'],
    'depression':   ['depressed', 'sad', 'hopeless', 'worthless', 'empty', 'numb', 'miserable'],
    'burnout':      ['burnout', 'burnt out', 'overwhelmed', 'overworked', 'exhausted mentally'],
    'nutrition':    ['eat', 'food', 'diet', 'nutrition', 'vitamin', 'meal', 'hungry', 'water'],
    'activity':     ['exercise', 'walk', 'gym', 'workout', 'physical', 'movement', 'stretch'],
    'crisis':       ['suicide', 'kill myself', 'end my life', 'want to die', 'hurt myself', 'self harm'],
    'happy':        ['happy', 'good', 'great', 'okay', 'fine', 'well', 'better', 'amazing'],
    'paranoia':     ['paranoid', 'suspicious', 'distrust', 'conspiracy'],
    'phq':          ['phq', 'quiz', 'assessment', 'test', 'evaluate', 'diagnose'],
    'breathing':    ['breathe', 'breathing', 'calm', 'relax', 'meditation'],
    'sunlight':     ['sunlight', 'sun', 'outside', 'outdoor', 'vitamin d'],
}

# ═══════════════════════════════════════════════════════
#  RESPONSES DATABASE
# ═══════════════════════════════════════════════════════
RESPONSES = {
    'greeting': [
        "Hello! I'm MindGuard, your mental wellness companion. How are you feeling today?",
        "Hi there! I'm here to help with fatigue, sleep, anxiety, nutrition and more. What's on your mind?",
    ],
    'farewell': [
        "Take care of yourself! Remember — your mental health matters. Come back anytime. 💙",
        "Goodbye! Remember to rest, hydrate, and be kind to yourself. 🌟",
    ],
    'happy': [
        "That's wonderful to hear! Keep maintaining those healthy habits. Is there anything specific I can help you improve?",
        "Great! Positive mood is a sign your wellness practices are working. How can I support you further?",
    ],
    'crisis': (
        "I'm genuinely concerned about what you shared. You are not alone and your life matters deeply. "
        "Please reach out immediately:\n"
        "🆘 iCall: 9152987821\n"
        "🆘 Vandrevala Foundation: 1860-2662-345 (24/7)\n"
        "🆘 AASRA: 9820466627\n\n"
        "I'm here with you. Would you like to talk about what's going on?"
    ),
    'default': [
        "I'm here to help with fatigue, sleep, anxiety, nutrition, burnout, and mental health assessment. What would you like to explore?",
        "I didn't quite catch that. Could you tell me more about how you're feeling? I'm here to listen.",
    ]
}

# ═══════════════════════════════════════════════════════
#  FATIGUE SCORING ENGINE
# ═══════════════════════════════════════════════════════
def calculate_fatigue_score(sleep_hours, work_hours, stress_level, activity_level):
    """
    Calculate fatigue score 0-100
    sleep_hours:   hours slept (0-12)
    work_hours:    hours worked/studied (0-16)
    stress_level:  1-10
    activity_level: 0=none, 1=light, 2=moderate, 3=active
    """
    # Sleep score (less sleep = more fatigue)
    sleep_score = max(0, (8 - sleep_hours) * 10)

    # Work score (more work = more fatigue)
    work_score = min(40, max(0, (work_hours - 6) * 5))

    # Stress score
    stress_score = (stress_level / 10) * 25

    # Activity (more activity = less fatigue)
    activity_relief = {0: 0, 1: -5, 2: -10, 3: -15}
    activity_score = activity_relief.get(activity_level, 0)

    total = sleep_score + work_score + stress_score + activity_score
    return max(0, min(100, int(total)))


def get_fatigue_level(score):
    if   score <= 30: return 'Low',    'green',  '✅'
    elif score <= 60: return 'Medium', 'amber',  '⚠️'
    else:             return 'High',   'red',    '🚨'


def get_fatigue_advice(score):
    if score <= 30:
        return {
            'summary': 'You are managing your energy well!',
            'tips': [
                'Maintain your current sleep schedule',
                'Stay hydrated with 8+ glasses of water',
                'Keep up light physical activity',
                'Check in weekly to track trends'
            ]
        }
    elif score <= 60:
        return {
            'summary': 'Moderate fatigue detected. Take action now.',
            'tips': [
                'Aim for 7-8 hours of sleep tonight',
                'Take a 5-minute break every 45 minutes',
                'Drink at least 8 glasses of water today',
                'Try the box breathing exercise',
                'Eat magnesium-rich foods (nuts, dark chocolate)'
            ]
        }
    else:
        return {
            'summary': 'High fatigue detected. Immediate action needed.',
            'tips': [
                'Stop non-essential tasks today',
                'Prioritize sleep — aim for 9 hours tonight',
                'Take a short 10-minute walk to reset',
                'Eat iron and B12 rich foods',
                'Consider speaking to a doctor if this persists',
                'Do not consume caffeine after 2pm'
            ]
        }

# ═══════════════════════════════════════════════════════
#  BURNOUT DETECTION
# ═══════════════════════════════════════════════════════
def detect_burnout(work_hours_per_week, stress_level, fatigue_score, days_without_break):
    """Simple burnout risk calculation"""
    score = 0
    if work_hours_per_week >= 50:  score += 30
    elif work_hours_per_week >= 40: score += 15
    if stress_level >= 8:          score += 25
    elif stress_level >= 6:         score += 12
    if fatigue_score >= 70:        score += 25
    elif fatigue_score >= 50:       score += 12
    if days_without_break >= 14:   score += 20
    elif days_without_break >= 7:   score += 10

    if   score >= 70: return 'High Risk',    score
    elif score >= 40: return 'Moderate Risk', score
    else:             return 'Low Risk',      score

# ═══════════════════════════════════════════════════════
#  PHQ-9 SCORING
# ═══════════════════════════════════════════════════════
def interpret_phq(total_score):
    if   total_score <= 4:  return 'Minimal',           'Minimal symptoms. Keep monitoring.'
    elif total_score <= 9:  return 'Mild',               'Mild symptoms. Consider self-care practices.'
    elif total_score <= 14: return 'Moderate',           'Moderate symptoms. Consider speaking to a counselor.'
    elif total_score <= 19: return 'Moderately Severe',  'Significant symptoms. Please consult a professional.'
    else:                   return 'Severe',             'Severe symptoms. Please seek professional help immediately.'

# ═══════════════════════════════════════════════════════
#  NUTRITION RECOMMENDATIONS
# ═══════════════════════════════════════════════════════
NUTRITION = {
    'teen': {
        'label': 'Teens (13-18)',
        'nutrients': [
            {'name': 'Calcium',   'amount': '1300mg/day', 'sources': 'Milk, yogurt, cheese'},
            {'name': 'Iron',      'amount': '15mg/day',   'sources': 'Spinach, lentils, meat'},
            {'name': 'Omega-3',   'amount': '1.1g/day',   'sources': 'Fish, walnuts, flaxseed'},
            {'name': 'Zinc',      'amount': '9-11mg/day', 'sources': 'Pumpkin seeds, nuts'},
        ],
        'avoid': ['Energy drinks — crash mood and focus',
                  'Excessive sugar — causes brain fog',
                  'Skipping breakfast — kills concentration'],
        'boost': ['Eggs for B12 and protein',
                  'Berries for antioxidants',
                  'Whole grains for sustained energy']
    },
    'young_adult': {
        'label': 'Young Adults (19-30)',
        'nutrients': [
            {'name': 'Vitamin B12', 'amount': '2.4mcg/day',  'sources': 'Eggs, dairy, fish'},
            {'name': 'Magnesium',   'amount': '310-400mg',   'sources': 'Nuts, seeds, dark chocolate'},
            {'name': 'Omega-3',     'amount': '1.6g/day',    'sources': 'Salmon, chia seeds'},
            {'name': 'Vitamin D',   'amount': '600 IU/day',  'sources': 'Sunlight, fortified milk'},
        ],
        'avoid': ['Excessive caffeine — increases anxiety',
                  'Processed foods — inflammatory',
                  'Alcohol — disrupts sleep and mood'],
        'boost': ['Blueberries — antioxidants for focus',
                  'Avocado — healthy fats for brain',
                  'Banana — quick natural energy']
    },
    'adult': {
        'label': 'Adults (31-50)',
        'nutrients': [
            {'name': 'CoQ10',      'amount': '100-200mg',   'sources': 'Beef, sardines, nuts'},
            {'name': 'Calcium',    'amount': '1000mg/day',  'sources': 'Dairy, broccoli, tofu'},
            {'name': 'Antioxidants','amount': 'Daily',      'sources': 'Berries, green tea, turmeric'},
            {'name': 'Folate',     'amount': '400mcg/day',  'sources': 'Leafy greens, beans, citrus'},
        ],
        'avoid': ['High sodium foods — increases stress hormones',
                  'Trans fats — inflammatory',
                  'Excessive sugar — energy crashes'],
        'boost': ['Turmeric — anti-inflammatory',
                  'Green tea — L-theanine for calm focus',
                  'Dark leafy greens — iron and folate']
    },
    'senior': {
        'label': 'Seniors (50+)',
        'nutrients': [
            {'name': 'Calcium',    'amount': '1200mg/day',  'sources': 'Dairy, fortified foods, broccoli'},
            {'name': 'Vitamin D',  'amount': '800 IU/day',  'sources': 'Sunlight, fatty fish, supplements'},
            {'name': 'Vitamin B12','amount': '2.4mcg/day',  'sources': 'Meat, fish, fortified cereals'},
            {'name': 'Hydration',  'amount': '8+ glasses',  'sources': 'Water, herbal teas, soups'},
        ],
        'avoid': ['High sodium — blood pressure risk',
                  'Underhydration — common in seniors',
                  'Excessive caffeine — sleep disruption'],
        'boost': ['Omega-3 rich fish twice a week',
                  'Probiotic foods — gut-brain connection',
                  'Colorful vegetables — cognitive protection']
    }
}

def get_age_group(age):
    if   age <= 18: return 'teen'
    elif age <= 30: return 'young_adult'
    elif age <= 55: return 'adult'
    else:           return 'senior'

# ═══════════════════════════════════════════════════════
#  INTENT DETECTION
# ═══════════════════════════════════════════════════════
def detect_intent(message):
    msg = message.lower()
    # Crisis always first
    for keyword in INTENTS['crisis']:
        if keyword in msg:
            return 'crisis'
    # Check other intents
    for intent, keywords in INTENTS.items():
        if intent == 'crisis': continue
        for keyword in keywords:
            if keyword in msg:
                return intent
    return 'default'

# ═══════════════════════════════════════════════════════
#  EMOTION DETECTION (simple rule-based)
# ═══════════════════════════════════════════════════════
def detect_emotion(message):
    msg = message.lower()
    negative = ['tired','exhausted','sad','anxious','stressed','bad','terrible',
                'awful','depressed','worried','scared','hopeless','lonely','miserable']
    positive = ['good','great','happy','okay','fine','well','excited',
                'amazing','wonderful','better','grateful','positive']
    neg_count = sum(1 for w in negative if w in msg)
    pos_count = sum(1 for w in positive if w in msg)
    if   neg_count > pos_count: return 'negative', neg_count
    elif pos_count > neg_count: return 'positive', pos_count
    else:                        return 'neutral',  0

# ═══════════════════════════════════════════════════════
#  ML MODEL (loads if emotion.csv exists)
# ═══════════════════════════════════════════════════════
ml_model     = None
ml_vectorizer= None
ml_encoder   = None

def load_ml_model():
    global ml_model, ml_vectorizer, ml_encoder
    try:
        if os.path.exists('emotion.csv'):
            data = pd.read_csv('emotion.csv')
            # Handle different column names
            if 'text' not in data.columns or 'emotions' not in data.columns:
                if 'label' in data.columns:
                    data = data.rename(columns={'label': 'emotions'})
            data = data.dropna(subset=['text', 'emotions'])

            X_train, X_test, y_train, y_test = train_test_split(
                data['text'], data['emotions'],
                test_size=0.2, random_state=42, stratify=data['emotions']
            )

            ml_vectorizer = TfidfVectorizer(max_df=0.9, min_df=2)
            X_train_vec   = ml_vectorizer.fit_transform(X_train)
            X_test_vec    = ml_vectorizer.transform(X_test)

            ml_encoder = LabelEncoder()
            y_train_enc= ml_encoder.fit_transform(y_train)
            y_test_enc = ml_encoder.transform(y_test)

            ml_model = LogisticRegression(C=0.1, class_weight='balanced', max_iter=500)
            ml_model.fit(X_train_vec, y_train_enc)

            acc = accuracy_score(y_test_enc, ml_model.predict(X_test_vec))
            print(f"✅ ML Model loaded. Test accuracy: {acc:.2%}")
        else:
            print("⚠️  emotion.csv not found. Using rule-based detection only.")
    except Exception as e:
        print(f"⚠️  ML model load failed: {e}. Using rule-based detection.")

def predict_emotion_ml(text):
    """Use ML model if available, else fall back to rules"""
    if ml_model and ml_vectorizer and ml_encoder:
        try:
            vec   = ml_vectorizer.transform([text])
            pred  = ml_model.predict(vec)[0]
            proba = ml_model.predict_proba(vec)[0].max()
            label = ml_encoder.inverse_transform([pred])[0]
            return label, float(proba)
        except:
            pass
    emotion, score = detect_emotion(text)
    return emotion, score / 10.0

# ═══════════════════════════════════════════════════════
#  API ROUTES
# ═══════════════════════════════════════════════════════

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Main chat endpoint
    Accepts: { message, user_name, age, context }
    Returns: { response, intent, emotion, quick_replies }
    """
    data    = request.json
    message = data.get('message', '')
    name    = data.get('user_name', 'friend')
    age     = data.get('age', None)
    context = data.get('context', {})

    intent         = detect_intent(message)
    emotion, conf  = predict_emotion_ml(message)

    response       = ''
    quick_replies  = []

    if intent == 'crisis':
        response = RESPONSES['crisis']
        quick_replies = ["I want to talk", "I'm okay, just venting"]

    elif intent == 'greeting':
        import random
        response = random.choice(RESPONSES['greeting'])
        quick_replies = ["I feel tired", "I'm stressed", "Sleep issues", "Nutrition advice"]

    elif intent == 'farewell':
        import random
        response = random.choice(RESPONSES['farewell'])

    elif intent == 'happy':
        import random
        response = random.choice(RESPONSES['happy'])
        quick_replies = ["Fatigue assessment", "Nutrition tips", "PHQ-9 quiz"]

    elif intent == 'fatigue':
        response = (f"I understand you're feeling drained, {name}. "
                    "Let me help you assess your fatigue level properly. "
                    "Use the /fatigue endpoint to calculate your score, "
                    "or tell me: how many hours did you sleep last night?")
        quick_replies = ["Less than 5 hours", "6-7 hours", "8+ hours", "Calculate fatigue score"]

    elif intent == 'sleep':
        response = (f"Sleep issues can really impact everything, {name}. "
                    "Here are evidence-based tips:\n\n"
                    "🌙 No screens 60 minutes before bed\n"
                    "🌡️ Keep room cool (18-20°C)\n"
                    "⏰ Same sleep/wake time daily\n"
                    "☕ No caffeine after 2pm\n"
                    "📦 Try box breathing to fall asleep faster\n\n"
                    "How many hours of sleep are you currently getting?")
        quick_replies = ["Less than 5 hours", "5-6 hours", "I keep waking up", "Breathing exercise"]

    elif intent == 'anxiety':
        response = (f"Anxiety is very manageable, {name}. Let's start right now.\n\n"
                    "📦 Box Breathing (do this now):\n"
                    "Inhale 4 sec → Hold 4 sec → Exhale 4 sec → Hold 4 sec\n"
                    "Repeat 4 times.\n\n"
                    "5️⃣ 5-4-3-2-1 Grounding:\n"
                    "Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.\n\n"
                    "How long have you been feeling anxious?")
        quick_replies = ["Start breathing exercise", "Chronic anxiety", "Exam stress", "Work stress"]

    elif intent == 'depression':
        response = (f"Thank you for sharing that with me, {name}. "
                    "What you're feeling is real and valid. 💙\n\n"
                    "Things that genuinely help:\n"
                    "☀️ 15 min morning sunlight daily\n"
                    "🚶 Even a 10-min walk changes brain chemistry\n"
                    "📝 Write 3 gratitudes tonight\n"
                    "📞 Talk to someone you trust\n\n"
                    "If this has lasted 2+ weeks, please see a doctor. "
                    "Depression is a medical condition — not a weakness.")
        quick_replies = ["Take PHQ-9 quiz", "I feel hopeless", "Find professional help"]

    elif intent == 'burnout':
        response = (f"Burnout is serious and needs attention, {name}.\n\n"
                    "Classic signs:\n"
                    "😶 Emotional exhaustion — feeling empty\n"
                    "😤 Cynicism — nothing feels meaningful\n"
                    "📉 Reduced performance\n"
                    "🤒 Physical symptoms — headaches, illness\n"
                    "😴 Chronic fatigue even after rest\n\n"
                    "How many days have you worked without a proper break?")
        quick_replies = ["Less than 7 days", "1-2 weeks", "More than 2 weeks", "Calculate burnout risk"]

    elif intent == 'nutrition':
        age_group = get_age_group(int(age)) if age else 'young_adult'
        nut       = NUTRITION[age_group]
        tips_text = '\n'.join([f"✅ {n['name']}: {n['amount']} — {n['sources']}" for n in nut['nutrients'][:3]])
        response  = (f"Here are nutrition recommendations for {nut['label']}:\n\n"
                     f"{tips_text}\n\n"
                     f"Brain-boosting foods: {', '.join(nut['boost'][:2])}\n\n"
                     "Would you like more specific advice for fatigue, sleep, or anxiety?")
        quick_replies = ["Foods for fatigue", "Foods for sleep", "Foods for anxiety"]

    elif intent == 'phq':
        response = ("Starting PHQ-9 Mental Health Assessment 📊\n\n"
                    "For each question, rate how often over the last 2 weeks:\n"
                    "A = Not at all | B = Several days | C = More than half | D = Nearly every day\n\n"
                    "Question 1: Little interest or pleasure in doing things?")
        quick_replies = ["A. Not at all", "B. Several days", "C. More than half", "D. Nearly every day"]

    elif intent == 'breathing':
        response = ("Let's do box breathing together 📦\n\n"
                    "1. Inhale slowly for 4 seconds\n"
                    "2. Hold for 4 seconds\n"
                    "3. Exhale for 4 seconds\n"
                    "4. Hold for 4 seconds\n\n"
                    "Repeat this 4 times. It resets your nervous system and reduces anxiety in under 2 minutes.\n\n"
                    "Ready? Start now... 🕐")
        quick_replies = ["I'm done - how do I feel?", "Try another technique", "Still anxious"]

    elif intent == 'sunlight':
        response = ("Sunlight is literally medicine for your brain ☀️\n\n"
                    "Benefits:\n"
                    "🧠 Boosts serotonin — happiness hormone\n"
                    "😴 Regulates melatonin — fixes sleep cycle\n"
                    "🦴 Produces Vitamin D — reduces depression risk 65%\n"
                    "⚡ Natural energy booster\n\n"
                    "Goal: 15-20 minutes of morning sunlight before 10am.\n\n"
                    "When did you last spend time outside?")
        quick_replies = ["Haven't gone out in days", "I go out daily", "What about cloudy days?"]

    else:
        import random
        response = random.choice(RESPONSES['default'])
        quick_replies = ["Fatigue assessment", "Sleep help", "Anxiety relief", "Nutrition advice", "PHQ-9 quiz"]

    try:
        from datetime import datetime
        db.chat_logs.insert_one({
            "user_name": name,
            "user_message": message,
            "bot_response": response,
            "intent": intent,
            "emotion": emotion,
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        print(f"Error saving chat log to MongoDB: {e}")

    return jsonify({
        'response':      response,
        'intent':        intent,
        'emotion':       emotion,
        'confidence':    round(conf, 2),
        'quick_replies': quick_replies,
        'user_name':     name
    })


@app.route('/api/fatigue', methods=['POST'])
def fatigue_score():
    """
    Calculate fatigue score
    Accepts: { sleep_hours, work_hours, stress_level, activity_level, user_name }
    Returns: { score, level, advice }
    """
    data           = request.json
    sleep_hours    = float(data.get('sleep_hours', 6))
    work_hours     = float(data.get('work_hours', 8))
    stress_level   = int(data.get('stress_level', 5))
    activity_level = int(data.get('activity_level', 1))
    user_name      = data.get('user_name', 'friend')

    score          = calculate_fatigue_score(sleep_hours, work_hours, stress_level, activity_level)
    level, color, emoji = get_fatigue_level(score)
    advice         = get_fatigue_advice(score)
    msg            = f"{emoji} {user_name}, your fatigue score is {score}/100 ({level}). {advice['summary']}"

    try:
        from datetime import datetime
        db.chat_logs.insert_one({
            "user_name": user_name,
            "user_message": f"Fatigue Check - Sleep:{sleep_hours}h Work:{work_hours}h Stress:{stress_level} Activity:{activity_level}",
            "bot_response": msg,
            "intent": "fatigue",
            "emotion": "neutral",
            "timestamp": datetime.utcnow()
        })
    except: pass

    return jsonify({
        'score':     score,
        'level':     level,
        'color':     color,
        'emoji':     emoji,
        'advice':    advice,
        'user_name': user_name,
        'message':   msg
    })


@app.route('/api/burnout', methods=['POST'])
def burnout_check():
    """
    Check burnout risk
    Accepts: { work_hours_per_week, stress_level, fatigue_score, days_without_break }
    """
    data                = request.json
    work_hours_per_week = int(data.get('work_hours_per_week', 40))
    stress_level        = int(data.get('stress_level', 5))
    fat_score           = int(data.get('fatigue_score', 50))
    days_without_break  = int(data.get('days_without_break', 7))

    level, score = detect_burnout(work_hours_per_week, stress_level, fat_score, days_without_break)

    recommendations = []
    if level == 'High Risk':
        recommendations = [
            "Take at least 2 days completely off work this week",
            "Speak to your manager about workload reduction",
            "Consider speaking to a mental health professional",
            "Establish strict work-hour boundaries immediately",
            "Prioritize sleep over all other activities"
        ]
    elif level == 'Moderate Risk':
        recommendations = [
            "Schedule a day off this week",
            "Reduce work hours by 20% for 2 weeks",
            "Identify and eliminate non-essential tasks",
            "Establish a clear end-of-work boundary each day",
            "Start a daily 10-minute meditation practice"
        ]
    else:
        recommendations = [
            "You're in good shape! Maintain current work-life balance",
            "Keep taking regular breaks throughout the day",
            "Continue monitoring your stress levels weekly"
        ]

    try:
        from datetime import datetime
        username = data.get('user_name', 'friend')
        db.chat_logs.insert_one({
            "user_name": username,
            "user_message": f"Burnout Check - Work:{work_hours_per_week}h Stress:{stress_level} Fatigue:{fat_score} Break:{days_without_break}d",
            "bot_response": f"Burnout Risk: {level} (Score: {score})",
            "intent": "burnout",
            "emotion": "neutral",
            "timestamp": datetime.utcnow()
        })
    except: pass

    return jsonify({
        'burnout_level':    level,
        'risk_score':       score,
        'recommendations':  recommendations
    })


@app.route('/api/phq', methods=['POST'])
def phq_score():
    """
    Interpret PHQ-9 score
    Accepts: { answers: [0,1,2,3, ...] } — array of 5-9 integers
    """
    data    = request.json
    answers = data.get('answers', [])
    total   = sum(answers)
    level, advice = interpret_phq(total)

    try:
        from datetime import datetime
        username = data.get('user_name', 'friend')
        db.chat_logs.insert_one({
            "user_name": username,
            "user_message": f"PHQ-9 Answers: {answers} (Total: {total})",
            "bot_response": f"PHQ-9 Result: {level}. {advice}",
            "intent": "phq",
            "emotion": "neutral",
            "timestamp": datetime.utcnow()
        })
    except: pass

    return jsonify({
        'total':  total,
        'level':  level,
        'advice': advice,
        'seek_help': total >= 10
    })


@app.route('/api/nutrition', methods=['POST'])
def nutrition():
    """
    Get age-specific nutrition recommendations
    Accepts: { age }
    """
    data      = request.json
    age       = int(data.get('age', 25))
    age_group = get_age_group(age)
    nut       = NUTRITION[age_group]

    return jsonify({
        'age_group':    age_group,
        'label':        nut['label'],
        'nutrients':    nut['nutrients'],
        'avoid':        nut['avoid'],
        'brain_boost':  nut['boost']
    })


@app.route('/api/emotion', methods=['POST'])
def emotion():
    """
    Detect emotion from text
    Accepts: { text }
    Returns: { emotion, confidence }
    """
    data     = request.json
    text     = data.get('text', '')
    detected, conf = predict_emotion_ml(text)

    return jsonify({
        'emotion':    detected,
        'confidence': round(conf, 2),
        'is_negative': detected in ['sadness', 'fear', 'anger', 'negative']
    })


@app.route('/api/weekly_report', methods=['POST'])
def weekly_report():
    """
    Generate a weekly wellness report
    Accepts: { mood_logs: [{day, mood, fatigue, sleep}] }
    """
    data      = request.json
    mood_logs = data.get('mood_logs', [])

    if not mood_logs:
        return jsonify({'error': 'No mood logs provided'}), 400

    avg_fatigue = sum(log.get('fatigue', 50) for log in mood_logs) / len(mood_logs)
    avg_sleep   = sum(log.get('sleep', 6)   for log in mood_logs) / len(mood_logs)
    neg_days    = sum(1 for log in mood_logs if log.get('mood') in ['sad','anxious','stressed'])

    insights = []
    if avg_fatigue > 60:  insights.append("Your average fatigue this week was high. Consider reducing workload.")
    if avg_sleep < 6:     insights.append("You averaged less than 6 hours of sleep. Prioritize sleep next week.")
    if neg_days >= 4:     insights.append("You had more negative days than positive. Consider speaking to someone.")
    if not insights:      insights.append("Great week! You maintained good mental wellness.")

    return jsonify({
        'average_fatigue': round(avg_fatigue, 1),
        'average_sleep':   round(avg_sleep, 1),
        'negative_days':   neg_days,
        'total_days':      len(mood_logs),
        'insights':        insights,
        'recommendation':  'Consider a PHQ-9 assessment' if neg_days >= 4 else 'Keep up the good work!'
    })


@app.route('/api/crisis_resources', methods=['GET'])
def crisis_resources():
    """Return crisis helpline information"""
    return jsonify({
        'helplines': [
            {'name': 'iCall',                    'number': '9152987821',    'hours': 'Mon-Sat 8am-10pm'},
            {'name': 'Vandrevala Foundation',    'number': '1860-2662-345', 'hours': '24/7'},
            {'name': 'AASRA',                    'number': '9820466627',    'hours': '24/7'},
            {'name': 'Snehi',                    'number': '044-24640050',  'hours': '8am-10pm'},
            {'name': 'Fortis Stress Helpline',   'number': '8376804102',    'hours': '24/7'},
        ],
        'message': 'You are not alone. These services are free and confidential.'
    })


# ═══════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════
if __name__ == '__main__':
    print("=" * 50)
    print("  WellBeing360 — MindGuard Chatbot Backend")
    print("  Team: NeuroSense")
    print("=" * 50)
    load_ml_model()
    print("\n🚀 Server starting at http://localhost:5000")
    print("📋 API Endpoints:")
    print("   POST /api/chat          — Main chatbot")
    print("   POST /api/fatigue       — Fatigue score")
    print("   POST /api/burnout       — Burnout check")
    print("   POST /api/phq           — PHQ-9 score")
    print("   POST /api/nutrition     — Nutrition advice")
    print("   POST /api/emotion       — Emotion detection")
    print("   POST /api/weekly_report — Weekly report")
    print("   GET  /api/crisis_resources — Helplines")
    print("=" * 50)
    app.run(debug=True, port=5000)