import cv2
import mediapipe as mp
import numpy as np
import os

# Correct relative path to Haar cascade
CASCADE_PATH = os.path.join(
    os.path.dirname(__file__),
    "models",
    "haarcascade_frontalface_default.xml"
)

face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True)

def extract_facial_features(image_path):
    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Image not found or path is incorrect")

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

    # Left eye landmarks (MediaPipe)
    top = landmarks[159]
    bottom = landmarks[145]

    eye_open = abs(top.y - bottom.y)
    features["eye_openness"] = round(float(eye_open), 4)

    # Simplified head pose (forward = 1)
    features["head_pose"] = 1

    return features


if __name__ == "__main__":
    sample_image = os.path.join(
        os.path.dirname(__file__),
        "../../../dataset/face_expression/sample.jpg"
    )

    print(extract_facial_features(sample_image))

def get_cv_features():
    """
    Returns CV features in the format required by ML
    """
    # If you already extract features from webcam / image
    # call that function here

    features = extract_facial_features()  # ⚠️ adjust name if needed

    return {
        "face_detected": features.get("face_detected", 0),
        "eye_openness": features.get("eye_openness", 0.0),
        "head_pose": features.get("head_pose", 0)
    }
import cv2
import tempfile
import os

def get_cv_features():
    """
    Capture one frame from webcam and extract CV features
    """

    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    cap.release()

    if not ret:
        return {
            "face_detected": 0,
            "eye_openness": 0.0,
            "head_pose": 0
        }

    # Save frame temporarily
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        image_path = tmp.name
        cv2.imwrite(image_path, frame)

    features = extract_facial_features(image_path)

    os.remove(image_path)

    return {
        "face_detected": features.get("face_detected", 0),
        "eye_openness": features.get("eye_openness", 0.0),
        "head_pose": features.get("head_pose", 0)
    }

