from flask import Flask, render_template, request, jsonify, session
from groq import Groq

app = Flask(__name__)
app.secret_key = "mindcare_secret_key_2024"
from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


client = Groq(api_key=GROQ_API_KEY)

# ─────────────────────────────────────────────────────────────────
# SYSTEM INSTRUCTION
# ─────────────────────────────────────────────────────────────────

instruction = (
    "You are MindCare, a compassionate and knowledgeable mental health and wellness assistant. "
    "Your role is to help users improve their overall wellbeing through science-backed advice on "
    "sleep, nutrition, hydration, breathing, and mental wellness. "

    "TOPICS YOU COVER: "
    "- Sleep: analysis of sleep hours, sleep hygiene, sleep disorders, tips to improve sleep quality. "
    "- Nutrition: macronutrients (carbs, protein, fats), key micronutrients (Vitamin D, B12, Iron, "
    "  Magnesium, Zinc, Omega-3), foods that boost mood, cognitive function, and energy levels. "
    "- Water Intake: daily hydration needs, effects of dehydration on mood/cognition/energy, "
    "  personalised water intake recommendations based on body weight or activity if provided. "
    "- Breathing Exercises: step-by-step guidance on Box Breathing (4-4-4-4), 4-7-8 Breathing, "
    "  Diaphragmatic Breathing, Alternate Nostril Breathing (Nadi Shodhana). "
    "- General mental wellness: stress management, anxiety reduction, mood improvement. "

    "WHEN USER PROVIDES HEALTH DATA (sleep hours, water intake, mood): "
    "Always personalise your response using that data. For example: "
    "- If sleep < 6 hrs → warn about sleep deprivation, recommend 7-9 hrs, suggest sleep hygiene tips. "
    "- If sleep 6-7 hrs → mildly under-rested, give gentle encouragement and tips. "
    "- If sleep 7-9 hrs → healthy, positively reinforce. "
    "- If sleep > 9 hrs → possible oversleeping, discuss potential causes and effects. "
    "- If water intake is low → recommend increase and explain hydration benefits. "
    "- Adjust nutrition advice based on mood (e.g., anxious → suggest Magnesium-rich foods). "

    "OFF-TOPIC HANDLING: "
    "If the user asks something completely unrelated to mental health, sleep, nutrition, hydration, "
    "breathing, or wellness (e.g., cricket, coding, politics, movies, cooking, finance), respond with: "
    "'I'm MindCare, your wellness companion. I specialise in mental health, sleep, nutrition, "
    "hydration, and breathing. Please ask me something related to your wellbeing! 🌿' "

    "RESPONSE FORMAT RULES — follow strictly: "
    "1. For LIST/NAME questions (e.g. 'list nutrients', 'types of breathing exercises') — "
    "   start with a heading line, then bullet points. Never start directly with bullets. "
    "2. For HOW/WHY questions (e.g. 'how does sleep affect mood') — "
    "   respond with 2-3 clear sentences only, no bullets. "
    "3. For WHAT questions with detail (e.g. 'what is magnesium') — "
    "   1 direct answer sentence, then 2 sentences of context, then 3 bullet point facts. "
    "4. For health data analysis — give personalised advice first, then actionable tips as bullets. "
    "5. For breathing exercise guidance — always give numbered steps. "
    "6. Keep all responses under 180 words. Be warm, specific, and actionable. "
    "7. Use emojis sparingly but meaningfully (e.g. 💧 for water, 😴 for sleep, 🥦 for nutrition). "

    "SAFETY: If a user expresses serious distress, self-harm thoughts, or a mental health crisis, "
    "respond with empathy, do NOT give medical diagnoses, and encourage them to contact a professional. "
    "Share: iCall (India): 9152987821 | Vandrevala Foundation: 1860-2662-345 | "
    "International: findahelpline.com"
)

# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────

def build_health_context(health_data: dict) -> str:
    """Convert health metrics dict into a context string for the LLM."""
    if not health_data:
        return ""
    parts = []
    if health_data.get("sleep"):
        parts.append(f"Sleep last night: {health_data['sleep']} hours")
    if health_data.get("water"):
        parts.append(f"Water consumed today: {health_data['water']} litres")
    if health_data.get("mood"):
        parts.append(f"Current mood: {health_data['mood']}")
    if health_data.get("weight"):
        parts.append(f"Body weight: {health_data['weight']} kg")
    if not parts:
        return ""
    return "\n\n[User's health data for this session:]\n" + "\n".join(f"  • {p}" for p in parts)


def is_health_data_message(text: str) -> bool:
    """Check if the message is submitting health metrics."""
    keywords = ["sleep", "hours", "water", "litres", "liters", "mood", "weight", "kg"]
    return sum(1 for k in keywords if k in text.lower()) >= 2


# ─────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────

@app.route('/')
def home():
    session.clear()
    return render_template('index.html')


@app.route('/update_health', methods=['POST'])
def update_health():
    """Store user health data in session."""
    data = request.json or {}
    session['health_data'] = {
        "sleep":  data.get("sleep", ""),
        "water":  data.get("water", ""),
        "mood":   data.get("mood", ""),
        "weight": data.get("weight", ""),
    }
    session['conversation'] = []   # reset conversation when data updates
    return jsonify({"status": "ok"})


@app.route('/get_response', methods=['POST'])
def get_response():
    user_input = request.json.get("message", "").strip()
    if not user_input:
        return jsonify({"error": "Empty message"}), 400

    # Retrieve or init conversation history
    if 'conversation' not in session:
        session['conversation'] = []

    health_data    = session.get('health_data', {})
    health_context = build_health_context(health_data)

    # Append health context only to the very first user turn or when data present
    full_message = user_input
    if health_context and len(session['conversation']) == 0:
        full_message = user_input + health_context

    # Build messages list for Groq (full history for memory)
    messages = [{"role": "system", "content": instruction}]
    messages += session['conversation']
    messages.append({"role": "user", "content": full_message})

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=400
        )
        reply = response.choices[0].message.content

        # Save to session history
        session['conversation'] = session['conversation'] + [
            {"role": "user",      "content": full_message},
            {"role": "assistant", "content": reply}
        ]

        return jsonify({"reply": reply})

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500


@app.route('/reset', methods=['POST'])
def reset():
    session['conversation'] = []
    return jsonify({"status": "reset"})


if __name__ == '__main__':
    app.run(debug=True, port=5000)