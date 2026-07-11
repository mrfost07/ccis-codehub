"""
CCIS Proctoring AI Service — Direct Camera Capture
====================================================
Uses OpenCV to capture frames directly from the webcam, exactly like
test_model_realtime.py. No browser frame intermediary — no black frames.

Pipeline: YuNet face detection → MediaPipe iris gaze → YOLO phone detection

Detection classes:
  looking_center, looking_left, looking_right, looking_up,
  looking_down, no_face, phone_detected
"""

import logging
import os
import threading
import time
from collections import deque
from typing import Any

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# ── Model paths ──────────────────────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models_ai')
YUNET_MODEL_PATH = os.path.join(MODELS_DIR, 'face_detection_yunet_2023mar.onnx')
YOLO_MODEL_PATH = os.path.join(MODELS_DIR, 'yolo11n.pt')
FACE_LANDMARKER_MODEL_PATH = os.path.join(MODELS_DIR, 'face_landmarker.task')

# ── Detection classes ────────────────────────────────────────────────────────
CLASS_LABELS = [
    'looking_center', 'looking_down', 'looking_left',
    'looking_right', 'looking_up', 'no_face', 'phone_detected',
]
VIOLATIONS = {
    'looking_left', 'looking_right', 'looking_up',
    'looking_down', 'no_face', 'phone_detected',
}

# ── Thresholds (match test_model_realtime.py) ────────────────────────────────
FACE_CONF_THRESHOLD = 0.80
YOLO_PHONE_CONF_THRESHOLD = 0.35
YOLO_PHONE_CLASS_ID = 67  # COCO "cell phone"

CALIBRATION_FRAMES = 25       # Match test script (was 15)
SMOOTHING_WINDOW = 3          # Faster response (3 frames ≈ 0.75s at 4fps)
HORIZONTAL_THRESHOLD = 0.10
UPWARD_THRESHOLD = 0.05
DOWNWARD_THRESHOLD = 0.09
UPWARD_SENSITIVITY_BOOST = 1.35
VIOLATION_CONFIRM_FRAMES = 4  # Faster flag (~1s at 4fps)
VIOLATION_COOLDOWN_FRAMES = 8 # Faster recovery after violation
SUSPICION_THRESHOLD = 0.55

# MediaPipe iris and eye landmarks
LEFT_IRIS = [468, 469, 470, 471, 472]
RIGHT_IRIS = [473, 474, 475, 476, 477]
LEFT_EYE_CORNERS = (33, 133)
RIGHT_EYE_CORNERS = (362, 263)
LEFT_EYE_LIDS = (159, 145)
RIGHT_EYE_LIDS = (386, 374)


class _ModelManager:
    """Thread-safe lazy model loader."""

    def __init__(self):
        self._lock = threading.Lock()
        self._loaded = False
        self._face_detector = None
        self._face_landmarker = None
        self._phone_detector = None
        self._active_sessions = 0

    @property
    def is_loaded(self):
        return self._loaded

    def acquire_session(self):
        with self._lock:
            self._active_sessions += 1
            if not self._loaded:
                self._load_models()

    def release_session(self):
        with self._lock:
            self._active_sessions = max(0, self._active_sessions - 1)

    def _load_models(self):
        logger.info('AI Proctor: Loading models (first session connected)...')
        start = time.time()

        # 1. YuNet face detector
        try:
            if os.path.exists(YUNET_MODEL_PATH):
                self._face_detector = {
                    'type': 'yunet',
                    'model': cv2.FaceDetectorYN.create(
                        YUNET_MODEL_PATH, '', (320, 320),
                        FACE_CONF_THRESHOLD, 0.3, 5000
                    ),
                }
                logger.info('AI Proctor: YuNet face detector loaded')
            else:
                cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                cascade = cv2.CascadeClassifier(cascade_path)
                if not cascade.empty():
                    self._face_detector = {'type': 'haar', 'model': cascade}
                    logger.info('AI Proctor: Haar cascade fallback loaded')
        except Exception as e:
            logger.warning(f'AI Proctor: Face detector failed to load: {e}')

        # 2. MediaPipe Face Landmarker
        try:
            import mediapipe as mp
            from mediapipe.tasks import python as mp_python
            from mediapipe.tasks.python import vision as mp_vision

            if os.path.exists(FACE_LANDMARKER_MODEL_PATH):
                options = mp_vision.FaceLandmarkerOptions(
                    base_options=mp_python.BaseOptions(
                        model_asset_path=FACE_LANDMARKER_MODEL_PATH
                    ),
                    running_mode=mp_vision.RunningMode.VIDEO,
                    num_faces=1,
                    min_face_detection_confidence=0.5,
                    min_face_presence_confidence=0.5,
                    min_tracking_confidence=0.5,
                    output_face_blendshapes=False,
                    output_facial_transformation_matrixes=False,
                )
                self._face_landmarker = mp_vision.FaceLandmarker.create_from_options(options)
                logger.info('AI Proctor: MediaPipe face landmarker loaded')
        except Exception as e:
            logger.warning(f'AI Proctor: Face landmarker failed to load: {e}')

        # 3. YOLO phone detector
        try:
            if os.path.exists(YOLO_MODEL_PATH):
                from ultralytics import YOLO
                self._phone_detector = YOLO(YOLO_MODEL_PATH)
                logger.info('AI Proctor: YOLO phone detector loaded')
        except Exception as e:
            logger.warning(f'AI Proctor: Phone detector failed to load: {e}')

        elapsed = time.time() - start
        self._loaded = True
        logger.info(f'AI Proctor: All models loaded in {elapsed:.1f}s')

    def get_next_timestamp(self):
        return int(time.time() * 1000)

    @property
    def face_detector(self):
        return self._face_detector

    @property
    def face_landmarker(self):
        return self._face_landmarker

    @property
    def phone_detector(self):
        return self._phone_detector


# ── Global singleton ─────────────────────────────────────────────────────────
_model_manager = _ModelManager()


# ── Detection helpers (from test_model_realtime.py) ──────────────────────────

def _detect_faces(frame):
    detector = _model_manager.face_detector
    if detector is None:
        return []

    h, w = frame.shape[:2]
    if detector['type'] == 'yunet':
        model = detector['model']
        model.setInputSize((w, h))
        faces = model.detect(frame)
        if faces[1] is None:
            return []
        boxes = []
        for row in faces[1]:
            x, y, bw, bh = row[:4]
            boxes.append((
                max(int(x), 0), max(int(y), 0),
                min(int(x + bw), w - 1), min(int(y + bh), h - 1),
                float(row[-1])
            ))
        return boxes

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detector['model'].detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
    return [(int(x), int(y), int(x + bw), int(y + bh), 1.0) for (x, y, bw, bh) in faces]


def _detect_phone(frame):
    detector = _model_manager.phone_detector
    if detector is None:
        return None
    try:
        results = detector.predict(frame, verbose=False, conf=YOLO_PHONE_CONF_THRESHOLD)
    except Exception:
        return None

    best = None
    for result in results:
        boxes = getattr(result, 'boxes', None)
        if boxes is None:
            continue
        cls_vals = boxes.cls.cpu().numpy().astype(int) if boxes.cls is not None else []
        conf_vals = boxes.conf.cpu().numpy() if boxes.conf is not None else []
        for cls_id, conf in zip(cls_vals, conf_vals):
            if cls_id == YOLO_PHONE_CLASS_ID:
                if best is None or conf > best:
                    best = float(conf)
    return best


def _extract_landmarks(frame_bgr, timestamp_ms):
    landmarker = _model_manager.face_landmarker
    if landmarker is None:
        return None
    try:
        import mediapipe as mp
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)
        if not result.face_landmarks:
            return None
        return result.face_landmarks[0]
    except Exception:
        return None


def _landmark_xy(landmarks, index, w, h):
    pt = landmarks[index]
    return (int(pt.x * w), int(pt.y * h))


def _iris_center(landmarks, indices, w, h):
    coords = np.array([_landmark_xy(landmarks, i, w, h) for i in indices], dtype=np.float32)
    center = coords.mean(axis=0)
    return (float(center[0]), float(center[1]))


def _eye_ratio(center, corner_a, corner_b):
    x_low = min(corner_a[0], corner_b[0])
    x_high = max(corner_a[0], corner_b[0])
    span = max(float(x_high - x_low), 1.0)
    return float((center[0] - x_low) / span)


def _eye_vert_ratio(center, lid_a, lid_b):
    y_low = min(lid_a[1], lid_b[1])
    y_high = max(lid_a[1], lid_b[1])
    span = max(float(y_high - y_low), 1.0)
    return float((center[1] - y_low) / span)


# ── Main Service ─────────────────────────────────────────────────────────────

class AIProctoringService:
    """
    AI Proctoring Service with direct camera capture.

    Primary mode: start_camera() opens webcam via OpenCV (like test_model_realtime.py)
    Fallback mode: analyze_frame() processes base64 frames from the browser
    """

    # Per-student states (shared across all service instances)
    _calibrations: dict[str, dict] = {}
    _histories: dict[str, deque] = {}
    _sessions: dict[str, dict] = {}
    _camera_threads: dict[str, threading.Thread] = {}
    _camera_stop_events: dict[str, threading.Event] = {}
    _state_lock = threading.Lock()

    def acquire(self):
        """Call when a proctoring WebSocket connects."""
        _model_manager.acquire_session()

    def release(self):
        """Call when a proctoring WebSocket disconnects."""
        _model_manager.release_session()

    def cleanup_student(self, participant_id: str):
        """Remove per-student state on disconnect."""
        self.stop_camera(participant_id)
        with self._state_lock:
            self._calibrations.pop(participant_id, None)
            self._histories.pop(participant_id, None)
            self._sessions.pop(participant_id, None)

    # ── Per-student state helpers ────────────────────────────────────────

    def _get_calibration(self, pid: str) -> dict:
        with self._state_lock:
            if pid not in self._calibrations:
                self._calibrations[pid] = {
                    'complete': False,
                    'samples': [],
                    'center_horizontal': 0.5,
                    'center_vertical': 0.5,
                }
            return self._calibrations[pid]

    def _get_history(self, pid: str) -> deque:
        with self._state_lock:
            if pid not in self._histories:
                self._histories[pid] = deque(maxlen=SMOOTHING_WINDOW)
            return self._histories[pid]

    def _get_session(self, pid: str) -> dict:
        with self._state_lock:
            if pid not in self._sessions:
                self._sessions[pid] = {
                    'violations': 0,
                    'violation_streak': 0,
                    'cooldown_frames': 0,
                }
            return self._sessions[pid]

    # ── Direct Camera Capture (same as test_model_realtime.py) ───────────

    def start_camera(self, participant_id: str, send_callback):
        """
        Start a background thread that captures webcam frames via OpenCV
        and runs the full detection pipeline, exactly like test_model_realtime.py.
        Results are sent via send_callback.
        """
        if participant_id in self._camera_threads:
            logger.warning(f'AI Proctor: camera already running for {participant_id}')
            return

        stop_event = threading.Event()
        self._camera_stop_events[participant_id] = stop_event

        thread = threading.Thread(
            target=self._camera_loop,
            args=(participant_id, send_callback, stop_event),
            daemon=True,
            name=f'proctor-cam-{participant_id[:8]}',
        )
        self._camera_threads[participant_id] = thread
        thread.start()
        logger.info(f'AI Proctor: camera thread started for {participant_id}')

    def stop_camera(self, participant_id: str):
        """Stop the camera capture thread for a participant."""
        stop_event = self._camera_stop_events.pop(participant_id, None)
        if stop_event:
            stop_event.set()
        thread = self._camera_threads.pop(participant_id, None)
        if thread and thread.is_alive():
            thread.join(timeout=3)
            logger.info(f'AI Proctor: camera thread stopped for {participant_id}')

    def _camera_loop(self, participant_id: str, send_callback, stop_event: threading.Event):
        """
        Background thread: direct webcam capture + full detection pipeline.
        This is the EXACT same approach as test_model_realtime.py.
        """
        # Find camera with retry (browser may still hold it briefly)
        cap = None
        for attempt in range(3):
            if stop_event.is_set():
                return

            for idx in range(3):
                test_cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
                if test_cap.isOpened():
                    ret, _ = test_cap.read()
                    if ret:
                        cap = test_cap
                        logger.info(f'AI Proctor: camera found at index {idx} (DirectShow)')
                        break
                    test_cap.release()
            if cap is None:
                cap = cv2.VideoCapture(0)
                if not cap.isOpened():
                    cap = None

            if cap is not None:
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

                # Warmup + verify we get real frames
                logger.info(f'AI Proctor: warming up camera for {participant_id} (attempt {attempt + 1})...')
                time.sleep(1.0)
                good_frames = 0
                for _ in range(20):
                    ret, frame = cap.read()
                    if ret and frame is not None and frame.mean() > 5:
                        good_frames += 1
                if good_frames >= 10:
                    break  # Camera is working
                else:
                    logger.warning(f'AI Proctor: camera gave {good_frames}/20 good frames, retrying...')
                    cap.release()
                    cap = None
                    time.sleep(2.0)  # Wait for OS to release hardware
            else:
                logger.warning(f'AI Proctor: camera not found (attempt {attempt + 1}), retrying...')
                time.sleep(2.0)

        if cap is None:
            logger.error('AI Proctor: could not open webcam after 3 attempts')
            try:
                send_callback({
                    'label': 'looking_center', 'confidence': 1.0,
                    'is_violation': False, 'calibrating': False,
                    'violations': 0, 'action': 'none',
                    'error': 'Camera not accessible — close other apps using the camera',
                })
            except Exception:
                pass
            return

        calib = self._get_calibration(participant_id)
        history = self._get_history(participant_id)
        session = self._get_session(participant_id)

        logger.info(f'AI Proctor: camera loop running for {participant_id}')
        frame_count = 0
        fps_start = time.time()

        while not stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)
                continue

            frame_count += 1
            timestamp_ms = _model_manager.get_next_timestamp()

            # ═══ Detection pipeline — all models run per frame ═══

            # 1. Face detection
            face_boxes = _detect_faces(frame)
            primary_face = max(
                face_boxes, key=lambda b: (b[2]-b[0])*(b[3]-b[1])
            ) if face_boxes else None

            if primary_face is None:
                # no_face: clear history, update session, send
                history.clear()
                self._update_session(session, 'no_face')
                result = self._build_result('no_face', 1.0, False, session, ['face_not_visible'])
                self._try_send(send_callback, result)
                time.sleep(0.03)
                continue

            # 2. Phone detection — completely independent, no calibration needed
            phone_conf = _detect_phone(frame)
            if phone_conf is not None:
                history.clear()
                self._update_session(session, 'phone_detected')
                result = self._build_result('phone_detected', phone_conf, False, session, ['phone_detected'])
                self._try_send(send_callback, result)
                time.sleep(0.03)
                continue

            # 3. Gaze tracking via MediaPipe landmarks
            landmarks = _extract_landmarks(frame, timestamp_ms)
            if landmarks is None:
                history.clear()
                self._update_session(session, 'no_face')
                result = self._build_result('no_face', 1.0, False, session, ['face_not_visible'])
                self._try_send(send_callback, result)
                time.sleep(0.03)
                continue

            h, w = frame.shape[:2]
            left_iris = _iris_center(landmarks, LEFT_IRIS, w, h)
            right_iris = _iris_center(landmarks, RIGHT_IRIS, w, h)

            lca = _landmark_xy(landmarks, LEFT_EYE_CORNERS[0], w, h)
            lcb = _landmark_xy(landmarks, LEFT_EYE_CORNERS[1], w, h)
            rca = _landmark_xy(landmarks, RIGHT_EYE_CORNERS[0], w, h)
            rcb = _landmark_xy(landmarks, RIGHT_EYE_CORNERS[1], w, h)
            lla = _landmark_xy(landmarks, LEFT_EYE_LIDS[0], w, h)
            llb = _landmark_xy(landmarks, LEFT_EYE_LIDS[1], w, h)
            rla = _landmark_xy(landmarks, RIGHT_EYE_LIDS[0], w, h)
            rlb = _landmark_xy(landmarks, RIGHT_EYE_LIDS[1], w, h)

            h_ratio = (_eye_ratio(left_iris, lca, lcb) + _eye_ratio(right_iris, rca, rcb)) / 2.0
            v_ratio = (_eye_vert_ratio(left_iris, lla, llb) + _eye_vert_ratio(right_iris, rla, rlb)) / 2.0

            # 4. Calibration (gaze only — phone already handled above)
            if not calib['complete']:
                if 0.25 <= h_ratio <= 0.75 and 0.15 <= v_ratio <= 0.85:
                    calib['samples'].append((h_ratio, v_ratio))
                    if len(calib['samples']) >= CALIBRATION_FRAMES:
                        arr = np.array(calib['samples'], dtype=np.float32)
                        calib['center_horizontal'] = float(arr[:, 0].mean())
                        calib['center_vertical'] = float(arr[:, 1].mean())
                        calib['complete'] = True
                        logger.info(f'AI Proctor: calibration complete for {participant_id}')
                history.clear()
                session['violation_streak'] = 0
                result = self._build_result('looking_center', 1.0, True, session, [])
                self._try_send(send_callback, result)
                time.sleep(0.03)
                continue

            # 5. Classify gaze direction
            h_delta = h_ratio - calib['center_horizontal']
            v_delta = v_ratio - calib['center_vertical']

            h_strength = min(abs(h_delta) / HORIZONTAL_THRESHOLD, 1.0)
            up_strength = min(max(-v_delta, 0.0) / UPWARD_THRESHOLD * UPWARD_SENSITIVITY_BOOST, 1.0)
            dn_strength = min(max(v_delta, 0.0) / DOWNWARD_THRESHOLD, 1.0)
            v_strength = max(up_strength, dn_strength)
            center_strength = max(0.0, 1.0 - max(h_strength, v_strength))

            preds = {lbl: 0.0 for lbl in CLASS_LABELS}
            preds['looking_center'] = center_strength
            if h_delta > HORIZONTAL_THRESHOLD:
                preds['looking_left'] = h_strength
            elif h_delta < -HORIZONTAL_THRESHOLD:
                preds['looking_right'] = h_strength
            if v_delta > DOWNWARD_THRESHOLD:
                preds['looking_down'] = max(preds['looking_down'], dn_strength)
            elif v_delta < -UPWARD_THRESHOLD:
                preds['looking_up'] = max(preds['looking_up'], up_strength)

            label = max(preds, key=preds.get)
            confidence = preds[label]

            if confidence <= 0.01:
                label = 'looking_center'
                confidence = 1.0
                preds['looking_center'] = 1.0

            # 6. Smooth gaze result
            # Only smooth normal gaze results (not no_face/phone/calibration)
            history.append(preds)
            averaged = {lbl: 0.0 for lbl in CLASS_LABELS}
            for lbl in averaged:
                averaged[lbl] = sum(item.get(lbl, 0.0) for item in history) / len(history)

            label = max(averaged, key=averaged.get)
            confidence = averaged[label]
            is_violation = label in VIOLATIONS and confidence >= SUSPICION_THRESHOLD

            # ── update_session_state() — EXACT match ──
            self._update_session(session, label)

            result = self._build_result(
                label, confidence, False, session,
                [label.replace('_', ' ')] if is_violation else []
            )
            self._try_send(send_callback, result)

            # Log FPS every 30 frames
            if frame_count % 30 == 0:
                elapsed = time.time() - fps_start
                fps = frame_count / elapsed if elapsed > 0 else 0
                logger.info(f'AI Proctor: {participant_id[:8]} — {label} ({confidence:.0%}) FPS={fps:.1f}')

            time.sleep(0.03)  # ~30fps cap

        # Cleanup
        cap.release()
        logger.info(f'AI Proctor: camera released for {participant_id}')

    def _try_send(self, callback, result):
        """Send result via callback, silently ignore if WS closed."""
        try:
            callback(result)
        except Exception:
            pass

    # ── Session management ───────────────────────────────────────────────

    def _update_session(self, session: dict, label: str):
        """Count sustained violations with confirmation + cooldown."""
        is_violation = label != 'looking_center'

        if session['cooldown_frames'] > 0:
            session['cooldown_frames'] -= 1
            if not is_violation:
                session['violation_streak'] = 0
            return

        if is_violation:
            session['violation_streak'] += 1
            if session['violation_streak'] >= VIOLATION_CONFIRM_FRAMES:
                session['violations'] += 1
                session['violation_streak'] = 0
                session['cooldown_frames'] = VIOLATION_COOLDOWN_FRAMES
        else:
            session['violation_streak'] = 0

    def _build_result(self, label, confidence, calibrating, session, events):
        is_violation = label in VIOLATIONS and not calibrating and confidence >= SUSPICION_THRESHOLD
        score = confidence if is_violation else 0.0
        action = 'flag' if score >= SUSPICION_THRESHOLD else ('warn' if score > 0.3 else 'none')

        return {
            'label': label,
            'confidence': round(confidence, 3),
            'is_violation': is_violation,
            'calibrating': calibrating,
            'violations': session['violations'],
            'suspicion_score': round(score, 3),
            'events': events,
            'action': action,
        }

    def _stub_result(self):
        return {
            'label': 'looking_center',
            'confidence': 1.0,
            'is_violation': False,
            'calibrating': False,
            'violations': 0,
            'suspicion_score': 0.0,
            'events': [],
            'action': 'none',
        }

    def should_flag(self, score: float) -> bool:
        return score >= SUSPICION_THRESHOLD
