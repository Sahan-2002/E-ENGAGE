import cv2
import mediapipe as mp
import numpy as np
import os
import time
import tempfile

# Load Haar cascade
CASCADE_PATH = os.path.join(
    os.path.dirname(__file__),
    "models",
    "haarcascade_frontalface_default.xml"
)
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

# MediaPipe FaceMesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True)


def extract_facial_features(image_path):
    image = cv2.imread(image_path)

    if image is None:
        return {
            "face_detected": 0,
            "eye_openness": 0.0,
            "head_pose": 0
        }

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    features = {
        "face_detected": 0,
        "eye_openness": 0.0,
        "head_pose": 0
    }

    if len(faces) == 0:
        return features

    features["face_detected"] = 1

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return features

    landmarks = results.multi_face_landmarks[0].landmark

    # Eye openness (MediaPipe)
    top = landmarks[159]
    bottom = landmarks[145]
    features["eye_openness"] = round(abs(top.y - bottom.y), 4)

    features["head_pose"] = 1  # simplified

    return features


def get_cv_features():
    """
    Capture ONE webcam frame and extract CV features
    """

    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("❌ CV ERROR: Camera not opened")
        return {
            "face_detected": 0,
            "eye_openness": 0.0,
            "head_pose": 0
        }

    # 🔥 VERY IMPORTANT: warm up camera
    time.sleep(2.0)

    ret, frame = cap.read()
    cap.release()

    print("CV DEBUG → Frame captured:", ret)

    if not ret:
        return {
            "face_detected": 0,
            "eye_openness": 0.0,
            "head_pose": 0
        }

    # Optional: show frame for debugging
    cv2.imshow("CV Debug Frame", frame)
    cv2.waitKey(1000)
    cv2.destroyAllWindows()

    # Save frame temporarily
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        image_path = tmp.name
        cv2.imwrite(image_path, frame)

    features = extract_facial_features(image_path)
    os.remove(image_path)

    return features


# Standalone test
if __name__ == "__main__":
    print(get_cv_features())
