import time
import csv
from datetime import datetime

# -----------------------------
# FOCUS SESSION MANAGER
# -----------------------------

focus_start = None

def start_focus():
    global focus_start
    focus_start = time.time()

def get_focus_time():

    if focus_start is None:
        return 0

    return int(time.time() - focus_start)


# -----------------------------
# TIMETABLE MANAGER
# -----------------------------

schedule = {
    "10:00": "Study",
    "11:00": "Break",
    "11:10": "Coding",
    "12:00": "Rest"
}

def get_current_task():

    now = datetime.now().strftime("%H:%M")

    task = "Free"

    for t in schedule:
        if now >= t:
            task = schedule[t]

    return task


# -----------------------------
# STRESS ENGINE
# -----------------------------

def calculate_stress(blink_rate):

    stress = max(0,100 - blink_rate * 2)

    return stress


# -----------------------------
# BREAK PREDICTOR
# -----------------------------

def predict_break(stress,fatigue,focus):

    if fatigue > 70:
        return "Take Eye Break"

    if stress > 80:
        return "Deep Breathing Break"

    if focus < 40:
        return "Short Walk"

    return "Continue Working"


# -----------------------------
# WELLNESS SCORE
# -----------------------------

def calculate_score(stress,fatigue,focus,posture):

    score = focus * 0.4
    score += (100 - stress) * 0.3
    score += (100 - fatigue) * 0.2

    if posture == "GOOD":
        score += 10

    return int(score)


# -----------------------------
# LEADERBOARD
# -----------------------------

leaderboard = []

def update_leaderboard(user,score):

    leaderboard.append({
        "user": user,
        "score": score
    })

    leaderboard.sort(key=lambda x:x["score"], reverse=True)

    return leaderboard


# -----------------------------
# SESSION LOGGER
# -----------------------------

def log_session(user,score):

    with open("sessions.csv","a",newline="") as f:

        writer = csv.writer(f)

        writer.writerow([
            datetime.now(),
            user,
            score
        ])


# -----------------------------
# DEMO TEST RUN
# -----------------------------

if __name__ == "__main__":

    print("Starting Focus Session")

    start_focus()

    # example AI values
    blink_rate = 15
    fatigue = 40
    focus = 75
    posture = "GOOD"

    stress = calculate_stress(blink_rate)

    task = get_current_task()

    suggestion = predict_break(stress,fatigue,focus)

    score = calculate_score(stress,fatigue,focus,posture)

    leaderboard_data = update_leaderboard("Harsh",score)

    log_session("Harsh",score)

    print("Current Task:",task)
    print("Stress:",stress)
    print("AI Suggestion:",suggestion)
    print("Wellness Score:",score)

    print("\nLeaderboard")

    for user in leaderboard_data:
        print(user["user"],user["score"])