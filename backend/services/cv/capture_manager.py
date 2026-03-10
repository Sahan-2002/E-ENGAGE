"""
capture_manager.py
Keeps the webcam open for the full session duration.
Grabs multiple frames per 20s window and averages results.
"""

import cv2
import mediapipe as mp
import os
import time
import threading

CASCADE_PATH = os.path.join(
    os.path.dirname(__file__),
    "models",
    "haarcascade_frontalface_default.xml"
)
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

mp_face_mesh = mp.solutions.face_mesh


class CameraManager:
    """
    Singleton-style camera manager.
    Opens camera once, keeps it alive, closes when session ends.
    """

    def __init__(self):
        self.cap = None
        self.face_mesh = None
        self.lock = threading.Lock()
        self.is_open = False

    def start(self):
        """Open camera and warm it up once."""
        with self.lock:
            if self.is_open:
                return True

            self.cap = cv2.VideoCapture(0)
            if not self.cap.isOpened():
                print("❌ Camera failed to open")
                self.is_open = False
                return False

            # Set resolution for faster capture
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 15)

            # Warm up — discard first few frames
            print("📷 Warming up camera...")
            for _ in range(10):
                self.cap.read()
                time.sleep(0.1)

            self.face_mesh = mp_face_mesh.FaceMesh(
                static_image_mode=False,   # False = video mode, faster
                max_num_faces=1,
                refine_landmarks=False,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )

            self.is_open = True
            print("✅ Camera ready")
            return True

    def stop(self):
        """Release camera at end of session."""
        with self.lock:
            if self.cap:
                self.cap.release()
                self.cap = None
            if self.face_mesh:
                self.face_mesh.close()
                self.face_mesh = None
            self.is_open = False
            print("📷 Camera released")

    def get_cv_features_averaged(self, num_frames=5, spread_seconds=10):
        """
        Capture num_frames frames spread over spread_seconds,
        average the results for a more reliable reading.
        Called once per 20s window (at the start of each cycle).
        """
        if not self.is_open or not self.cap:
            return self._empty_features()

        frames = []
        interval = spread_seconds / num_frames  # e.g. 10s / 5 = every 2s

        for i in range(num_frames):
            features = self._capture_single_frame()
            frames.append(features)
            if i < num_frames - 1:
                time.sleep(interval)

        valid_frames = [f for f in frames if f["face_detected"] == 1]
        face_presence_ratio = len(valid_frames) / max(1, num_frames)

        if not valid_frames:
            print("⚠️ No face detected in any frame this window")
            empty = self._empty_features()
            empty["face_presence_ratio"] = round(face_presence_ratio, 4)
            return empty

        # Approximate blink rate from open->closed eye transitions.
        # With sparse sampling this is a coarse estimate, but it is stable enough
        # for trend features in this 20s pipeline.
        blink_count = 0
        prev_closed = None
        for frame in frames:
            if frame["face_detected"] != 1:
                continue
            is_closed = frame["eye_openness"] < 0.015
            if prev_closed is False and is_closed is True:
                blink_count += 1
            prev_closed = is_closed

        observed_seconds = max(spread_seconds, 1)
        blink_rate = (blink_count / observed_seconds) * 60.0

        head_pose_deviation = sum(f["head_pose_deviation"] for f in valid_frames) / len(valid_frames)

        # Average the valid readings
        avg = {
            "face_detected": 1,
            "face_presence_ratio": round(face_presence_ratio, 4),
            "eye_openness": round(
                sum(r["eye_openness"] for r in valid_frames) / len(valid_frames), 4
            ),
            "blink_rate": round(blink_rate, 4),
            "head_pose_deviation": round(head_pose_deviation, 4),
            # Keep stability score for existing consumers (UI/model).
            "head_pose": round(max(0.0, 1.0 - head_pose_deviation), 4),
            "frames_captured": len(valid_frames),
            "frames_attempted": num_frames,
        }

        print(f"📊 CV: {len(valid_frames)}/{num_frames} faces | "
              f"face_ratio={avg['face_presence_ratio']:.2f} eye={avg['eye_openness']:.4f} "
              f"blink_rate={avg['blink_rate']:.2f} head_dev={avg['head_pose_deviation']:.4f}")
        return avg

    def _capture_single_frame(self):
        """Grab one frame and extract features."""
        with self.lock:
            if not self.cap or not self.cap.isOpened():
                return self._empty_features()

            ret, frame = self.cap.read()

        if not ret or frame is None:
            print("⚠️ Frame grab failed")
            return self._empty_features()

        # Face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
        )

        if len(faces) == 0:
            return self._empty_features()

        # MediaPipe landmarks
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return {
                "face_detected": 1,
                "eye_openness": 0.0,
                "head_pose_deviation": 1.0,
                "head_pose": 0.0,
            }

        landmarks = results.multi_face_landmarks[0].landmark

        # Eye openness (vertical distance between eyelid landmarks)
        top    = landmarks[159]
        bottom = landmarks[145]
        eye_openness = round(abs(top.y - bottom.y), 4)

        # Head pose deviation — nose tip offset from eye-center.
        nose     = landmarks[1]
        left_eye = landmarks[33]
        right_eye= landmarks[263]
        center_x = (left_eye.x + right_eye.x) / 2
        deviation = abs(nose.x - center_x)
        head_pose_deviation = round(min(1.0, deviation / 0.1), 4)
        head_pose_stability = round(max(0.0, 1.0 - head_pose_deviation), 4)

        return {
            "face_detected": 1,
            "eye_openness":  eye_openness,
            "head_pose_deviation": head_pose_deviation,
            "head_pose": head_pose_stability,
        }

    def _empty_features(self):
        return {
            "face_detected":    0,
            "face_presence_ratio": 0.0,
            "eye_openness":     0.0,
            "blink_rate": 0.0,
            "head_pose_deviation": 1.0,
            "head_pose":        0.0,
            "frames_captured":  0,
            "frames_attempted": 0,
        }


# Global singleton — import this everywhere
camera = CameraManager()
