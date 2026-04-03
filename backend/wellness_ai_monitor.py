import cv2
import mediapipe as mp
import numpy as np
import time

mp_face_mesh = mp.solutions.face_mesh
mp_pose = mp.solutions.pose

face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)
pose = mp_pose.Pose()

LEFT_EYE = [33,160,158,133,153,144]
RIGHT_EYE = [362,385,387,263,373,380]

EAR_THRESHOLD = 0.23

blink_count = 0
closed_frames = 0
total_frames = 0

start_time = time.time()

heatmap = None


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

    total_frames += 1

    if heatmap is None:
        heatmap = np.zeros_like(frame[:,:,0]).astype(float)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    face_results = face_mesh.process(rgb)
    pose_results = pose.process(rgb)

    h, w, _ = frame.shape

    # -------- FACE + BLINK DETECTION --------
    if face_results.multi_face_landmarks:

        for face_landmarks in face_results.multi_face_landmarks:

            left_eye = []
            right_eye = []

            for id in LEFT_EYE:

                x = int(face_landmarks.landmark[id].x * w)
                y = int(face_landmarks.landmark[id].y * h)

                left_eye.append([x,y])

                heatmap[y,x] += 1

                cv2.circle(frame,(x,y),3,(0,255,0),-1)

            for id in RIGHT_EYE:

                x = int(face_landmarks.landmark[id].x * w)
                y = int(face_landmarks.landmark[id].y * h)

                right_eye.append([x,y])

                heatmap[y,x] += 1

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

            if closed_frames > 15:
                cv2.putText(frame,"FATIGUE ALERT",(40,120),
                            cv2.FONT_HERSHEY_SIMPLEX,1.2,(0,0,255),3)

    # -------- POSTURE DETECTION --------
    if pose_results.pose_landmarks:

        landmarks = pose_results.pose_landmarks.landmark

        nose = landmarks[0]
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]

        nose_point = (int(nose.x*w), int(nose.y*h))
        left_shoulder_point = (int(left_shoulder.x*w), int(left_shoulder.y*h))
        right_shoulder_point = (int(right_shoulder.x*w), int(right_shoulder.y*h))

        shoulder_center = (
            int((left_shoulder_point[0] + right_shoulder_point[0]) / 2),
            int((left_shoulder_point[1] + right_shoulder_point[1]) / 2)
        )

        cv2.circle(frame,nose_point,5,(255,0,0),-1)
        cv2.circle(frame,left_shoulder_point,5,(255,0,0),-1)
        cv2.circle(frame,right_shoulder_point,5,(255,0,0),-1)

        cv2.line(frame,nose_point,shoulder_center,(255,0,0),2)

        neck_distance = abs(nose_point[0] - shoulder_center[0])

        if neck_distance < 20:
            posture = "GOOD"
            posture_color = (0,255,0)
        elif neck_distance < 40:
            posture = "WARNING"
            posture_color = (0,255,255)
        else:
            posture = "BAD POSTURE"
            posture_color = (0,0,255)

        cv2.putText(frame,f"Posture: {posture}",
                    (20,200),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    posture_color,
                    2)

    # -------- METRICS --------
    elapsed_time = time.time() - start_time

    blink_rate = blink_count / (elapsed_time/60 + 0.001)

    fatigue_score = min(100, closed_frames*2 + blink_rate*0.5)

    stress_score = max(0, 100 - blink_rate*2)

    focus_level = max(0, 100 - fatigue_score)

    cv2.putText(frame,f"Blinks: {blink_count}",(20,40),
                cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,255,0),2)

    cv2.putText(frame,f"Blink Rate/min: {int(blink_rate)}",(20,70),
                cv2.FONT_HERSHEY_SIMPLEX,0.7,(255,255,0),2)

    cv2.putText(frame,f"Fatigue Score: {int(fatigue_score)}",(20,100),
                cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,165,255),2)

    cv2.putText(frame,f"Stress Score: {int(stress_score)}",(20,130),
                cv2.FONT_HERSHEY_SIMPLEX,0.7,(255,0,255),2)

    cv2.putText(frame,f"Focus Level: {int(focus_level)}",(20,160),
                cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,255,255),2)

    # -------- HEATMAP --------
    heatmap_display = cv2.normalize(heatmap,None,0,255,cv2.NORM_MINMAX)
    heatmap_display = heatmap_display.astype(np.uint8)

    heatmap_display = cv2.applyColorMap(heatmap_display, cv2.COLORMAP_JET)

    overlay = cv2.addWeighted(frame,0.7,heatmap_display,0.3,0)

    cv2.imshow("AI Wellness Monitor",overlay)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()