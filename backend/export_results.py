import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
import time
import os

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

LEFT_EYE = [33,160,158,133,153,144]
RIGHT_EYE = [362,385,387,263,373,380]

EAR_THRESHOLD = 0.23

blink_count = 0
closed_frames = 0
ear_total = 0
frame_count = 0

start_time = time.time()

os.makedirs("output_report", exist_ok=True)

def eye_aspect_ratio(eye):

    A = np.linalg.norm(eye[1] - eye[5])
    B = np.linalg.norm(eye[2] - eye[4])
    C = np.linalg.norm(eye[0] - eye[3])

    return (A + B) / (2.0 * C)

cap = cv2.VideoCapture(0)

while True:

    ret, frame = cap.read()

    if not ret:
        break

    frame = cv2.flip(frame,1)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = face_mesh.process(rgb)

    if results.multi_face_landmarks:

        for face_landmarks in results.multi_face_landmarks:

            h, w, _ = frame.shape

            left_eye = []
            right_eye = []

            for id in LEFT_EYE:
                x = int(face_landmarks.landmark[id].x * w)
                y = int(face_landmarks.landmark[id].y * h)
                left_eye.append([x,y])

            for id in RIGHT_EYE:
                x = int(face_landmarks.landmark[id].x * w)
                y = int(face_landmarks.landmark[id].y * h)
                right_eye.append([x,y])

            left_eye = np.array(left_eye)
            right_eye = np.array(right_eye)

            leftEAR = eye_aspect_ratio(left_eye)
            rightEAR = eye_aspect_ratio(right_eye)

            ear = (leftEAR + rightEAR) / 2

            ear_total += ear
            frame_count += 1

            if ear < EAR_THRESHOLD:
                closed_frames += 1
            else:
                if closed_frames > 2:
                    blink_count += 1
                closed_frames = 0

            cv2.putText(frame,f"Blinks: {blink_count}",(20,40),
                        cv2.FONT_HERSHEY_SIMPLEX,1,(0,255,0),2)

            cv2.putText(frame,f"EAR: {round(ear,2)}",(20,80),
                        cv2.FONT_HERSHEY_SIMPLEX,1,(255,0,0),2)

    cv2.imshow("AI Wellness Monitor",frame)

    if cv2.waitKey(1) & 0xFF == 27:
        snapshot = frame.copy()
        break

cap.release()
cv2.destroyAllWindows()

# ---------- FINAL METRICS ----------

elapsed_time = time.time() - start_time

avg_ear = ear_total / frame_count if frame_count else 0

blink_rate = blink_count / (elapsed_time/60 + 0.001)

fatigue_score = max(0, min(100, (0.25-avg_ear)*300))

stress_score = max(0, min(100, 100 - blink_rate*2))

focus_score = max(0, 100 - fatigue_score)

timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

# ---------- SAVE SNAPSHOT ----------

snapshot_path = "output_report/final_snapshot.jpg"
cv2.imwrite(snapshot_path, snapshot)

# ---------- SAVE EXCEL ----------

data = [{
    "Time": timestamp,
    "Total Blinks": blink_count,
    "Blink Rate": round(blink_rate,2),
    "Average EAR": round(avg_ear,3),
    "Fatigue Score": round(fatigue_score,2),
    "Stress Score": round(stress_score,2),
    "Focus Score": round(focus_score,2),
    "Snapshot": snapshot_path
}]

df = pd.DataFrame(data)

excel_path = "output_report/wellness_final_report.xlsx"
df.to_excel(excel_path,index=False)

print("Report Saved:", excel_path)