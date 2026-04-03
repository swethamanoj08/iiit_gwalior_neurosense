import cv2
import mediapipe as mp
import numpy as np
import time
import json
import os
from datetime import datetime

mp_face_mesh = mp.solutions.face_mesh
mp_pose = mp.solutions.pose

face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)
pose = mp_pose.Pose()

LEFT_EYE = [33,160,158,133,153,144]
RIGHT_EYE = [362,385,387,263,373,380]

EAR_THRESHOLD = 0.23

blink_count = 0
closed_frames = 0

start_time = time.time()

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

    face_results = face_mesh.process(rgb)
    pose_results = pose.process(rgb)

    h,w,_ = frame.shape

    posture = "GOOD"

    if face_results.multi_face_landmarks:

        for face_landmarks in face_results.multi_face_landmarks:

            left_eye = []
            right_eye = []

            for id in LEFT_EYE:

                x = int(face_landmarks.landmark[id].x * w)
                y = int(face_landmarks.landmark[id].y * h)

                left_eye.append([x,y])

                cv2.circle(frame,(x,y),3,(0,255,0),-1)

            for id in RIGHT_EYE:

                x = int(face_landmarks.landmark[id].x * w)
                y = int(face_landmarks.landmark[id].y * h)

                right_eye.append([x,y])

                cv2.circle(frame,(x,y),3,(0,255,0),-1)

            left_eye = np.array(left_eye)
            right_eye = np.array(right_eye)

            leftEAR = eye_aspect_ratio(left_eye)
            rightEAR = eye_aspect_ratio(right_eye)

            ear = (leftEAR + rightEAR) / 2

            if ear < EAR_THRESHOLD:
                closed_frames += 1
            else:
                if closed_frames > 2:
                    blink_count += 1
                closed_frames = 0


    if pose_results.pose_landmarks:

        landmarks = pose_results.pose_landmarks.landmark

        nose = landmarks[0]
        ls = landmarks[11]
        rs = landmarks[12]

        nose_point = (int(nose.x*w),int(nose.y*h))
        ls_point = (int(ls.x*w),int(ls.y*h))
        rs_point = (int(rs.x*w),int(rs.y*h))

        center = ((ls_point[0]+rs_point[0])//2,(ls_point[1]+rs_point[1])//2)

        cv2.line(frame,nose_point,center,(255,0,0),2)

        dist = abs(nose_point[0] - center[0])

        if dist > 40:
            posture = "BAD"


    elapsed = time.time() - start_time

    blink_rate = blink_count / (elapsed/60 + 0.001)

    fatigue = min(100, blink_rate * 2)

    stress = max(0,100 - blink_rate * 2)

    focus = max(0,100 - fatigue)

    task = get_current_task()

    score = int((focus*0.4) + ((100-stress)*0.3) + ((100-fatigue)*0.2))

    if posture == "GOOD":
        score += 10


    # WRITE METRICS SAFELY
    data = {
        "stress": int(stress),
        "fatigue": int(fatigue),
        "focus": int(focus),
        "posture": posture,
        "task": task,
        "score": score
    }

    temp_file = "metrics_temp.json"

    with open(temp_file,"w") as f:
        json.dump(data,f)

    os.replace(temp_file,"metrics.json")


    cv2.putText(frame,f"Stress: {int(stress)}",(20,40),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,0,255),2)
    cv2.putText(frame,f"Focus: {int(focus)}",(20,70),cv2.FONT_HERSHEY_SIMPLEX,0.7,(255,255,0),2)
    cv2.putText(frame,f"Posture: {posture}",(20,100),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,255,0),2)

    cv2.imshow("Wellness360 AI Monitor",frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()