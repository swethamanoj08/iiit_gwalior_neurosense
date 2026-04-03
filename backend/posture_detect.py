import cv2
import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()

mp_drawing = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)

while True:

    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame,1)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = pose.process(rgb)

    h, w, _ = frame.shape

    if results.pose_landmarks:

        landmarks = results.pose_landmarks.landmark

        nose = landmarks[0]
        left_shoulder = landmarks[11]
        right_shoulder = landmarks[12]

        nose_point = (int(nose.x * w), int(nose.y * h))
        left_shoulder_point = (int(left_shoulder.x * w), int(left_shoulder.y * h))
        right_shoulder_point = (int(right_shoulder.x * w), int(right_shoulder.y * h))

        shoulder_center = (
            int((left_shoulder_point[0] + right_shoulder_point[0]) / 2),
            int((left_shoulder_point[1] + right_shoulder_point[1]) / 2)
        )

        # draw landmarks
        cv2.circle(frame, nose_point, 6, (0,255,0), -1)
        cv2.circle(frame, left_shoulder_point, 6, (0,255,0), -1)
        cv2.circle(frame, right_shoulder_point, 6, (0,255,0), -1)

        cv2.line(frame, nose_point, shoulder_center, (255,0,0), 2)

        # posture detection
        neck_distance = abs(nose_point[0] - shoulder_center[0])

        if neck_distance < 20:
            posture = "GOOD POSTURE"
            color = (0,255,0)

        elif neck_distance < 40:
            posture = "WARNING"
            color = (0,255,255)

        else:
            posture = "BAD POSTURE"
            color = (0,0,255)

        cv2.putText(frame, posture,
                    (30,40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    color,
                    2)

    cv2.imshow("Posture Detection", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()