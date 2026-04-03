import streamlit as st
import cv2
import numpy as np
import mediapipe as mp
import time

st.set_page_config(page_title="Wellness 360", layout="wide")

# -----------------------------
# Mediapipe Face Mesh Setup
# -----------------------------
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils


# -----------------------------
# Cache FaceMesh Model
# -----------------------------
@st.cache_resource
def load_model():
    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    return face_mesh


# -----------------------------
# Blink Detection Logic
# -----------------------------
def eye_aspect_ratio(eye):
    A = np.linalg.norm(np.array(eye[1]) - np.array(eye[5]))
    B = np.linalg.norm(np.array(eye[2]) - np.array(eye[4]))
    C = np.linalg.norm(np.array(eye[0]) - np.array(eye[3]))

    ear = (A + B) / (2.0 * C)
    return ear


# -----------------------------
# Stress Detection From Webcam
# -----------------------------
def stress_detection():

    st.subheader("Stress Detection (Blink Monitoring)")

    run = st.checkbox("Start Camera")

    FRAME_WINDOW = st.image([])

    cap = cv2.VideoCapture(0)

    face_mesh = load_model()

    blink_count = 0
    EAR_THRESHOLD = 0.20

    while run:
        success, frame = cap.read()

        if not success:
            st.warning("Camera not detected")
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        results = face_mesh.process(rgb)

        if results.multi_face_landmarks:

            for face_landmarks in results.multi_face_landmarks:

                mp_drawing.draw_landmarks(
                    frame,
                    face_landmarks,
                    mp_face_mesh.FACEMESH_CONTOURS
                )

        FRAME_WINDOW.image(frame)

    cap.release()


# -----------------------------
# Main App
# -----------------------------
def main():

    st.title("🧠 Wellness 360 - Stress Monitor")

    st.write("AI Powered Stress Monitoring using Blink Detection")

    menu = ["Home", "Start Monitoring"]

    choice = st.sidebar.selectbox("Menu", menu)

    if choice == "Home":
        st.write("Welcome to Wellness 360")

    if choice == "Start Monitoring":
        stress_detection()

    if st.sidebar.button("Reset Cache"):
        st.cache_resource.clear()


# -----------------------------
# Run App
# -----------------------------
if __name__ == "__main__":
    main()