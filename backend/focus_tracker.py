import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import time
import os

latest_focus_results = {}

def generate_focus_frames():
    global latest_focus_results
    
    # Load model
    model_path = os.path.join(os.path.dirname(__file__), 'face_landmarker.task')
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(base_options=base_options,
                                           output_face_blendshapes=False,
                                           output_facial_transformation_matrixes=False,
                                           num_faces=1)
    
    try:
        detector = vision.FaceLandmarker.create_from_options(options)
    except Exception as e:
        print("Error loading FaceLandmarker:", e)
        return

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

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)
            total_frames += 1

            if heatmap is None:
                heatmap = np.zeros_like(frame[:,:,0]).astype(float)

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            
            detection_result = detector.detect(mp_image)

            if detection_result.face_landmarks:
                for face_landmarks in detection_result.face_landmarks:
                    h, w, _ = frame.shape
                    left_eye = []
                    right_eye = []

                    for id in LEFT_EYE:
                        x = int(face_landmarks[id].x * w)
                        y = int(face_landmarks[id].y * h)
                        left_eye.append([x,y])
                        if y < h and x < w:
                            heatmap[y,x] += 1

                    for id in RIGHT_EYE:
                        x = int(face_landmarks[id].x * w)
                        y = int(face_landmarks[id].y * h)
                        right_eye.append([x,y])
                        if y < h and x < w:
                            heatmap[y,x] += 1

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
                        cv2.putText(frame, "FATIGUE ALERT", (40,120),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,0,255), 3)

            elapsed_time = time.time() - start_time
            blink_rate = blink_count / (elapsed_time/60 + 0.001)
            fatigue_score = min(100, closed_frames*2 + blink_rate*0.5)
            stress_score = max(0, 100 - blink_rate*2)
            focus_level = max(0, 100 - fatigue_score)
            
            if elapsed_time > 20:
                latest_focus_results = {
                    "total_blinks": int(blink_count),
                    "blink_rate": int(blink_rate),
                    "fatigue": int(fatigue_score),
                    "stress": int(stress_score),
                    "focus": int(focus_level)
                }
                break # Cleanly exit the stream after 20 seconds

            # Draw very minimal tracking visual
            cv2.putText(frame, f"Analyzing: {int(20 - elapsed_time)}s", (20,40),
                        cv2.FONT_HERSHEY_DUPLEX, 1, (0,255,0), 2)
            
            if heatmap.max() > 0:
                heatmap_display = cv2.normalize(heatmap, None, 0, 255, cv2.NORM_MINMAX)
                heatmap_display = heatmap_display.astype(np.uint8)
                heatmap_display = cv2.applyColorMap(heatmap_display, cv2.COLORMAP_JET)
                overlay = cv2.addWeighted(frame, 0.7, heatmap_display, 0.3, 0)
            else:
                overlay = frame

            _, buffer = cv2.imencode('.jpg', overlay)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        cap.release()
