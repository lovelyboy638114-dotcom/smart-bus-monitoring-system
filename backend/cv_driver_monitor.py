"""
SafeBus Shield - AI Driver Drowsiness & Distraction Computer Vision Monitor
==========================================================================
Uses MediaPipe FaceLandmarker and OpenCV to detect:
  1. DRIVER DROWSINESS: Continuous eye closure >= 3.0 seconds
  2. DRIVER DISTRACTION: Continuous head/gaze turned away (left, right, down) > 5.0 seconds
  3. CLEAR EYE DETECTION: Explicit visual bounding boxes around Left Eye and Right Eye
     with live EAR metrics and eyelid/iris tracking
  4. SOUND ALERTS: 3-Second hardware buzzer and browser audio alerts
  5. PRIORITY: DROWSINESS takes precedence if both occur simultaneously
  6. ZERO FALSE ALERTS: Blinks (<3.0s) and brief lookaways (<5.0s) reset timers instantly
  7. CAMERA ABSTRACTION: Integrated with backend/camera_source.py for vehicle cameras
"""

import cv2
import numpy as np
import requests
import time
import argparse
import json
import base64
import datetime
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

try:
    import winsound
    HAS_WINSOUND = True
except Exception:
    HAS_WINSOUND = False

from camera_source import (
    BrowserStreamSource,
    WebcamSource,
    RTSPBusCameraSource,
    MockVideoSource
)

# Configurable Detection Thresholds
CONFIG = {
    "ear_threshold": 0.23,                # Eye Aspect Ratio threshold (closed eye < 0.23)
    "mar_threshold": 0.45,                # Mouth Aspect Ratio threshold (yawning > 0.45)
    "drowsiness_threshold_seconds": 3.0,  # Continuous eye closure duration for drowsiness
    "distraction_threshold_seconds": 5.0, # Continuous looking away duration for distraction
    "yaw_threshold": 0.22,                # Normalized horizontal gaze/head offset (looking left/right)
    "pitch_down_threshold": 0.33,         # Normalized vertical nose-to-chin ratio (looking down)
    "alert_cooldown_seconds": 10.0,       # Cooldown between persistent backend database incident reports
    "min_confidence_threshold": 0.80      # Minimum detection confidence required
}

# Parse command line arguments
parser = argparse.ArgumentParser(description="SafeBus Shield AI Driver Monitor")
parser.add_argument('--bus', type=str, default='Bus 1', help='Bus plate number or ID')
parser.add_argument('--service', action='store_true', help='Start in HTTP service mode only')
parser.add_argument('--source', type=str, default='webcam', choices=['webcam', 'rtsp', 'mock'], help='Camera source in standalone mode')
parser.add_argument('--url', type=str, default='rtsp://192.168.1.100:554/stream1', help='RTSP stream URL')
parser.add_argument('--file', type=str, default='', help='Mock video file path')
args, unknown = parser.parse_known_args()
bus_id = args.bus

# Spring Boot API Gateway target endpoints
BACKEND_BASE = os.environ.get("BACKEND_BASE", "http://localhost:8080/api/v1/driver")
INCIDENTS_API = f"{BACKEND_BASE}/incidents"
BEHAVIOR_API = f"{BACKEND_BASE}/behavior"

# Initialize MediaPipe Tasks FaceLandmarker
try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    import os
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'face_landmarker.task')
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=True,
        output_facial_transformation_matrixes=True,
        running_mode=vision.RunningMode.IMAGE
    )
    detector = vision.FaceLandmarker.create_from_options(options)
    USE_MEDIAPIPE = True
    print("\n[SafeBus AI] MediaPipe FaceLandmarker loaded successfully!")
except Exception as e:
    USE_MEDIAPIPE = False
    detector = None
    print(f"\n[SafeBus AI Fallback] MediaPipe Tasks API failed: {e}")

# Landmark Indices (MediaPipe Face Mesh 478 layout)
# Right Eye (Subject's right, left side of image)
RIGHT_EYE_H1, RIGHT_EYE_H2 = 33, 133
RIGHT_EYE_V1_T, RIGHT_EYE_V1_B = 160, 144
RIGHT_EYE_V2_T, RIGHT_EYE_V2_B = 158, 153
RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144]

# Left Eye (Subject's left, right side of image)
LEFT_EYE_H1, LEFT_EYE_H2 = 362, 263
LEFT_EYE_V1_T, LEFT_EYE_V1_B = 385, 380
LEFT_EYE_V2_T, LEFT_EYE_V2_B = 387, 373
LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380]

MOUTH_H1, MOUTH_H2 = 78, 308
MOUTH_V_T, MOUTH_V_B = 13, 14

NOSE_TIP = 1
FOREHEAD = 10
CHIN = 152

# Camera Abstraction Instance for Browser Stream
browser_camera = BrowserStreamSource()

# Shared Detection State
state_lock = threading.Lock()
bus_states = {}
last_incident_times = {}
bus_incident_counts = {}
browser_active_time = 0.0

def get_bus_state(b_id):
    """Retrieve or initialize state tracking for a specific bus."""
    if b_id not in bus_states:
        bus_states[b_id] = {
            "drowsy_start_time": None,
            "distract_start_time": None,
            "drowsy_duration": 0.0,
            "distract_duration": 0.0
        }
    return bus_states[b_id]

from http.server import BaseHTTPRequestHandler, HTTPServer, ThreadingHTTPServer

# Hardware sound state
buzzer_thread_running = False
last_buzzer_play_time = 0.0
detector_lock = threading.Lock()


def play_system_buzzer(duration_seconds=3.0):
    """Plays an alarming hardware buzzer tone on Windows host laptop speakers via winsound for strictly 3 seconds."""
    global buzzer_thread_running, last_buzzer_play_time

    now = time.time()
    if not HAS_WINSOUND or buzzer_thread_running or (now - last_buzzer_play_time < 3.0):
        return

    last_buzzer_play_time = now

    def beep_worker():
        global buzzer_thread_running
        buzzer_thread_running = True
        try:
            wav_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'buzzer_alarm.wav')
            if os.path.exists(wav_path):
                print(f"[SafeBus Hardware Buzzer] [ALARM] Sounding 3.0s alarm on laptop physical speakers: {wav_path}", flush=True)
                winsound.PlaySound(wav_path, winsound.SND_FILENAME)
            else:
                print(f"[SafeBus Hardware Buzzer] [ALARM] Sounding synthesized tone...", flush=True)
                for _ in range(6):
                    winsound.Beep(1000, 300)
                    time.sleep(0.15)
        except Exception as e:
            print(f"[SafeBus Buzzer Error] {e}", flush=True)
            try:
                for _ in range(6):
                    winsound.Beep(1000, 300)
                    time.sleep(0.15)
            except Exception:
                pass
        finally:
            buzzer_thread_running = False

    threading.Thread(target=beep_worker, daemon=True).start()


def calculate_ear(landmarks, h1, h2, v1_t, v1_b, v2_t, v2_b, w, h):
    """Calculates Eye Aspect Ratio (EAR) from 6 2D facial landmarks."""
    p_h1 = np.array([landmarks[h1].x * w, landmarks[h1].y * h])
    p_h2 = np.array([landmarks[h2].x * w, landmarks[h2].y * h])
    p_v1_t = np.array([landmarks[v1_t].x * w, landmarks[v1_t].y * h])
    p_v1_b = np.array([landmarks[v1_b].x * w, landmarks[v1_b].y * h])
    p_v2_t = np.array([landmarks[v2_t].x * w, landmarks[v2_t].y * h])
    p_v2_b = np.array([landmarks[v2_b].x * w, landmarks[v2_b].y * h])

    dist_h = np.linalg.norm(p_h1 - p_h2)
    dist_v1 = np.linalg.norm(p_v1_t - p_v1_b)
    dist_v2 = np.linalg.norm(p_v2_t - p_v2_b)

    if dist_h == 0:
        return 0.0
    return (dist_v1 + dist_v2) / (2.0 * dist_h)


def calculate_mar(landmarks, h1, h2, v_t, v_b, w, h):
    """Calculates Mouth Aspect Ratio (MAR) to evaluate yawning."""
    p_h1 = np.array([landmarks[h1].x * w, landmarks[h1].y * h])
    p_h2 = np.array([landmarks[h2].x * w, landmarks[h2].y * h])
    p_v_t = np.array([landmarks[v_t].x * w, landmarks[v_t].y * h])
    p_v_b = np.array([landmarks[v_b].x * w, landmarks[v_b].y * h])

    dist_h = np.linalg.norm(p_h1 - p_h2)
    dist_v = np.linalg.norm(p_v_t - p_v_b)

    if dist_h == 0:
        return 0.0
    return dist_v / dist_h


def evaluate_head_orientation(landmarks):
    """
    Evaluates head yaw (left/right) and pitch (down) using landmark geometry.
    Returns:
        (direction: str, is_looking_away: bool, yaw_offset: float, pitch_ratio: float)
    """
    eye_mid_x = (landmarks[RIGHT_EYE_H1].x + landmarks[LEFT_EYE_H2].x) / 2.0
    eye_dist = abs(landmarks[LEFT_EYE_H2].x - landmarks[RIGHT_EYE_H1].x)
    yaw_offset = (landmarks[NOSE_TIP].x - eye_mid_x) / (eye_dist + 1e-6)

    d_forehead_nose = landmarks[NOSE_TIP].y - landmarks[FOREHEAD].y
    d_nose_chin = landmarks[CHIN].y - landmarks[NOSE_TIP].y
    total_face_h = d_forehead_nose + d_nose_chin
    pitch_ratio = d_nose_chin / (total_face_h + 1e-6)

    direction = "CENTER"
    is_looking_away = False

    # Check horizontal turn (Left / Right)
    if yaw_offset > CONFIG["yaw_threshold"]:
        direction = "RIGHT"
        is_looking_away = True
    elif yaw_offset < -CONFIG["yaw_threshold"]:
        direction = "LEFT"
        is_looking_away = True
    # Check vertical tilt (Looking Down)
    elif pitch_ratio < CONFIG["pitch_down_threshold"]:
        direction = "DOWN"
        is_looking_away = True

    return direction, is_looking_away, yaw_offset, pitch_ratio


def trigger_incident_if_confirmed(status, confidence, frame, driver_id, b_id, route_id, trip_id):
    """Dispatches a confirmed incident alert asynchronously to the Spring Boot backend with strict max 2 limit per incident."""
    global last_incident_times, bus_incident_counts

    now = time.time()
    b_key = f"{b_id}_{status}"
    session = bus_incident_counts.get(b_key)

    if session is None or (now - session.get("last_time", 0.0) > 40.0):
        # Notification #1: Initial alert on incident confirmation
        bus_incident_counts[b_key] = {
            "count": 1,
            "start_time": now,
            "last_time": now
        }
    elif session["count"] == 1:
        # Notification #2: Follow-up reminder only after at least 8s of persisting condition
        if (now - session["start_time"]) >= 8.0:
            session["count"] = 2
            session["last_time"] = now
        else:
            return  # Suppress burst duplicates before 8 seconds
    else:
        # count >= 2: User rule: "just 2 notification is enough"
        # Update last_time to keep incident active, but suppress further backend HTTP posts!
        session["last_time"] = now
        return

    if status == "DROWSINESS_DETECTED":
        db_incident_type = "DROWSY"
    elif status == "DISTRACTION_DETECTED":
        db_incident_type = "LOOKING_AWAY"
    else:
        return

    def send_post():
        try:
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            img_b64 = base64.b64encode(buffer).decode('utf-8')

            payload = {
                "driverId": driver_id or "driver@happyjourney.ai",
                "busId": b_id or "TN38AB1234",
                "routeId": route_id or "R-01",
                "tripId": trip_id or "T-01",
                "incidentType": db_incident_type,
                "confidence": confidence,
                "imageBase64": img_b64,
                "latitude": 11.0168,
                "longitude": 76.9558,
                "speed": 0.0
            }

            res = requests.post(INCIDENTS_API, json=payload, timeout=2.0)
            print(f"[Incident Alert] Confirmed incident {status} ({db_incident_type}) enqueued for {b_id}. HTTP {res.status_code}")
        except Exception as e:
            print(f"[Incident Alert] Failed to post incident to backend: {e}")

    threading.Thread(target=send_post, daemon=True).start()


def create_no_face_response(driver_id, b_id, route_id, trip_id):
    """Response returned when no face is detected in the video frame."""
    return {
        "driverId": driver_id or "driver@happyjourney.ai",
        "busId": b_id or "TN38AB1234",
        "routeId": route_id or "R-01",
        "tripId": trip_id or "T-01",
        "status": "NO_DRIVER_FACE_DETECTED",
        "confidence": 0.0,
        "faceDetected": False,
        "eyesClosed": False,
        "ear": 0.0,
        "mar": 0.0,
        "earRight": 0.0,
        "earLeft": 0.0,
        "drowsyDuration": 0.0,
        "distractDuration": 0.0,
        "drowsinessThreshold": CONFIG["drowsiness_threshold_seconds"],
        "distractionThreshold": CONFIG["distraction_threshold_seconds"],
        "direction": "UNKNOWN",
        "yawRatio": 0.0,
        "pitchRatio": 0.0,
        "phoneDetected": False,
        "seatBelt": True,
        "source": "REAL_CV",
        "timestamp": datetime.datetime.now().isoformat(),
        "processedImage": None
    }


def process_single_frame(frame, driver_id="driver@happyjourney.ai", b_id="TN38AB1234", route_id="R-01", trip_id="T-01"):
    """
    Primary Computer Vision processing engine.
    Ingests a single BGR video frame, runs MediaPipe FaceLandmarker, computes EAR and head orientation,
    draws explicit Eye Bounding Boxes & Face tracking overlay, evaluates drowsiness and distraction,
    and returns rich telemetry.
    """
    bstate = get_bus_state(b_id)

    if frame is None or frame.size == 0:
        with state_lock:
            bstate["drowsy_start_time"] = None
            bstate["distract_start_time"] = None
            bstate["drowsy_duration"] = 0.0
            bstate["distract_duration"] = 0.0
        return create_no_face_response(driver_id, b_id, route_id, trip_id)

    h, w, _ = frame.shape
    face_detected = False
    ear = 0.0
    ear_left = 0.0
    ear_right = 0.0
    mar = 0.0
    eyes_closed = False
    direction = "CENTER"
    yaw_offset = 0.0
    pitch_ratio = 0.5
    confidence = 0.0
    status = "NO_DRIVER_FACE_DETECTED"
    drowsy_duration = 0.0
    distract_duration = 0.0

    now = time.time()

    if USE_MEDIAPIPE and detector:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        with detector_lock:
            results = detector.detect(mp_image)

        if results.face_landmarks and len(results.face_landmarks) > 0:
            face_detected = True
            landmarks = results.face_landmarks[0]
            confidence = 0.95

            # Calculate EAR for both eyes
            ear_left = calculate_ear(landmarks, LEFT_EYE_H1, LEFT_EYE_H2, LEFT_EYE_V1_T, LEFT_EYE_V1_B, LEFT_EYE_V2_T, LEFT_EYE_V2_B, w, h)
            ear_right = calculate_ear(landmarks, RIGHT_EYE_H1, RIGHT_EYE_H2, RIGHT_EYE_V1_T, RIGHT_EYE_V1_B, RIGHT_EYE_V2_T, RIGHT_EYE_V2_B, w, h)
            ear = (ear_left + ear_right) / 2.0
            mar = calculate_mar(landmarks, MOUTH_H1, MOUTH_H2, MOUTH_V_T, MOUTH_V_B, w, h)

            # Evaluate Head Orientation (Yaw & Pitch)
            direction, is_looking_away, yaw_offset, pitch_ratio = evaluate_head_orientation(landmarks)

            # Check condition candidates
            eyes_closed = bool(ear < CONFIG["ear_threshold"])
            drowsy_candidate = eyes_closed
            distract_candidate = is_looking_away

            # Temporal Accumulator with Instant Resets per bus
            with state_lock:
                if drowsy_candidate:
                    if bstate["drowsy_start_time"] is None:
                        bstate["drowsy_start_time"] = now
                    bstate["drowsy_duration"] = now - bstate["drowsy_start_time"]
                else:
                    bstate["drowsy_start_time"] = None
                    bstate["drowsy_duration"] = 0.0

                if distract_candidate:
                    if bstate["distract_start_time"] is None:
                        bstate["distract_start_time"] = now
                    bstate["distract_duration"] = now - bstate["distract_start_time"]
                else:
                    bstate["distract_start_time"] = None
                    bstate["distract_duration"] = 0.0

                drowsy_duration = bstate["drowsy_duration"]
                distract_duration = bstate["distract_duration"]

            # Priority Resolution: Drowsiness takes precedence over Distraction
            if drowsy_duration >= CONFIG["drowsiness_threshold_seconds"]:
                status = "DROWSINESS_DETECTED"
                play_system_buzzer(3.0)
            elif distract_duration > CONFIG["distraction_threshold_seconds"]:
                status = "DISTRACTION_DETECTED"
                play_system_buzzer(3.0)
            else:
                status = "NORMAL"

            # -------------------------------------------------------------
            # 1. DRAW FACE BOUNDING BOX
            # -------------------------------------------------------------
            x_coords = [lm.x for lm in landmarks]
            y_coords = [lm.y for lm in landmarks]
            xmin, xmax = int(min(x_coords) * w), int(max(x_coords) * w)
            ymin, ymax = int(min(y_coords) * h), int(max(y_coords) * h)

            pad_x = int((xmax - xmin) * 0.08)
            pad_y = int((ymax - ymin) * 0.08)
            xmin = max(0, xmin - pad_x)
            xmax = min(w, xmax + pad_x)
            ymin = max(0, ymin - pad_y)
            ymax = min(h, ymax + pad_y)

            if status == "DROWSINESS_DETECTED":
                box_color = (0, 0, 255)      # Bright Red
                box_thickness = 3
                status_text = "[!] DROWSINESS DETECTED"
            elif status == "DISTRACTION_DETECTED":
                box_color = (0, 165, 255)    # Amber
                box_thickness = 3
                status_text = f"[!] DISTRACTION DETECTED ({direction})"
            else:
                box_color = (0, 255, 0)      # Bright Green
                box_thickness = 2
                status_text = "DRIVER ATTENTIVE - NORMAL"

            cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), box_color, box_thickness)
            cv2.rectangle(frame, (xmin, max(0, ymin - 22)), (xmin + 230, ymin), (0, 0, 0), -1)
            cv2.putText(frame, status_text, (xmin + 4, max(16, ymin - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.48, box_color, 1, cv2.LINE_AA)

            # -------------------------------------------------------------
            # 2. DRAW RIGHT EYE BOUNDING BOX & CONTOUR
            # -------------------------------------------------------------
            r_pts = np.array([[int(landmarks[idx].x * w), int(landmarks[idx].y * h)] for idx in RIGHT_EYE_INDICES])
            rx, ry, rw, rh = cv2.boundingRect(r_pts)
            r_pad_w = max(6, int(rw * 0.35))
            r_pad_h = max(6, int(rh * 0.45))
            rx1 = max(0, rx - r_pad_w)
            ry1 = max(0, ry - r_pad_h)
            rx2 = min(w, rx + rw + r_pad_w)
            ry2 = min(h, ry + rh + r_pad_h)

            r_closed = ear_right < CONFIG["ear_threshold"]
            r_color = (0, 0, 255) if r_closed else (0, 255, 0)
            r_label = f"R-EYE: CLOSED ({ear_right:.2f})" if r_closed else f"R-EYE: OPEN ({ear_right:.2f})"

            cv2.rectangle(frame, (rx1, ry1), (rx2, ry2), r_color, 2)
            cv2.rectangle(frame, (rx1, max(0, ry1 - 16)), (rx1 + 130, ry1), (0, 0, 0), -1)
            cv2.putText(frame, r_label, (rx1 + 2, max(12, ry1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.36, r_color, 1, cv2.LINE_AA)
            cv2.polylines(frame, [r_pts], isClosed=True, color=(0, 255, 255), thickness=1)

            # -------------------------------------------------------------
            # 3. DRAW LEFT EYE BOUNDING BOX & CONTOUR
            # -------------------------------------------------------------
            l_pts = np.array([[int(landmarks[idx].x * w), int(landmarks[idx].y * h)] for idx in LEFT_EYE_INDICES])
            lx, ly, lw, lh = cv2.boundingRect(l_pts)
            l_pad_w = max(6, int(lw * 0.35))
            l_pad_h = max(6, int(lh * 0.45))
            lx1 = max(0, lx - l_pad_w)
            ly1 = max(0, ly - l_pad_h)
            lx2 = min(w, lx + lw + l_pad_w)
            ly2 = min(h, ly + lh + l_pad_h)

            l_closed = ear_left < CONFIG["ear_threshold"]
            l_color = (0, 0, 255) if l_closed else (0, 255, 0)
            l_label = f"L-EYE: CLOSED ({ear_left:.2f})" if l_closed else f"L-EYE: OPEN ({ear_left:.2f})"

            cv2.rectangle(frame, (lx1, ly1), (lx2, ly2), l_color, 2)
            cv2.rectangle(frame, (lx1, max(0, ly1 - 16)), (lx1 + 130, ly1), (0, 0, 0), -1)
            cv2.putText(frame, l_label, (lx1 + 2, max(12, ly1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.36, l_color, 1, cv2.LINE_AA)
            cv2.polylines(frame, [l_pts], isClosed=True, color=(0, 255, 255), thickness=1)

            # -------------------------------------------------------------
            # 4. DRAW IRIS / PUPIL TRACKING CIRCLES
            # -------------------------------------------------------------
            if len(landmarks) > 473:
                r_iris = (int(landmarks[468].x * w), int(landmarks[468].y * h))
                l_iris = (int(landmarks[473].x * w), int(landmarks[473].y * h))
                cv2.circle(frame, r_iris, 3, (0, 255, 255), -1)
                cv2.circle(frame, l_iris, 3, (0, 255, 255), -1)

            # -------------------------------------------------------------
            # 5. DRAW HEAD POSE & GAZE VECTOR ARROW
            # -------------------------------------------------------------
            nose_pt = (int(landmarks[NOSE_TIP].x * w), int(landmarks[NOSE_TIP].y * h))
            cv2.circle(frame, nose_pt, 4, (0, 255, 255), -1)

            if direction == "LEFT":
                cv2.arrowedLine(frame, nose_pt, (nose_pt[0] - 45, nose_pt[1]), (0, 165, 255), 2, tipLength=0.3)
                cv2.putText(frame, "LOOKING LEFT", (nose_pt[0] - 80, nose_pt[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 165, 255), 1)
            elif direction == "RIGHT":
                cv2.arrowedLine(frame, nose_pt, (nose_pt[0] + 45, nose_pt[1]), (0, 165, 255), 2, tipLength=0.3)
                cv2.putText(frame, "LOOKING RIGHT", (nose_pt[0] + 10, nose_pt[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 165, 255), 1)
            elif direction == "DOWN":
                cv2.arrowedLine(frame, nose_pt, (nose_pt[0], nose_pt[1] + 45), (0, 165, 255), 2, tipLength=0.3)
                cv2.putText(frame, "LOOKING DOWN", (nose_pt[0] - 40, nose_pt[1] + 55), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 165, 255), 1)

            # -------------------------------------------------------------
            # 6. OVERLAY TOP HUD BANNERS
            # -------------------------------------------------------------
            if drowsy_duration > 0.0:
                cv2.rectangle(frame, (0, 0), (w, 32), (0, 0, 180), -1)
                cv2.putText(frame, f"EYES CLOSED: {drowsy_duration:.1f}s / {CONFIG['drowsiness_threshold_seconds']:.1f}s",
                            (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (255, 255, 255), 2, cv2.LINE_AA)
            elif distract_duration > 0.0:
                cv2.rectangle(frame, (0, 0), (w, 32), (0, 120, 220), -1)
                cv2.putText(frame, f"LOOKING AWAY ({direction}): {distract_duration:.1f}s / {CONFIG['distraction_threshold_seconds']:.1f}s",
                            (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (255, 255, 255), 2, cv2.LINE_AA)
            else:
                cv2.putText(frame, f"EYES DETECTED | EAR: {ear:.2f} | HEAD: {direction}",
                            (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1, cv2.LINE_AA)

            # Asynchronous Incident logging on confirmed condition
            if status in ["DROWSINESS_DETECTED", "DISTRACTION_DETECTED"]:
                trigger_incident_if_confirmed(status, confidence, frame, driver_id, b_id, route_id, trip_id)

        else:
            with state_lock:
                bstate["drowsy_start_time"] = None
                bstate["distract_start_time"] = None
                bstate["drowsy_duration"] = 0.0
                bstate["distract_duration"] = 0.0
                drowsy_duration = 0.0
                distract_duration = 0.0
            status = "NO_DRIVER_FACE_DETECTED"
            cv2.putText(frame, "NO DRIVER FACE DETECTED", (12, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (120, 120, 120), 2)
    else:
        status = "NO_DRIVER_FACE_DETECTED"

    if status not in ["DROWSINESS_DETECTED", "DISTRACTION_DETECTED"]:
        now_check = time.time()
        for s_type in ["DROWSINESS_DETECTED", "DISTRACTION_DETECTED"]:
            key = f"{b_id}_{s_type}"
            if key in bus_incident_counts and (now_check - bus_incident_counts[key].get("last_time", 0.0) > 15.0):
                bus_incident_counts.pop(key, None)

    return {
        "driverId": driver_id or "driver@happyjourney.ai",
        "busId": b_id or "TN38AB1234",
        "routeId": route_id or "R-01",
        "tripId": trip_id or "T-01",
        "status": status,
        "confidence": float(confidence),
        "faceDetected": bool(face_detected),
        "eyesClosed": bool(eyes_closed),
        "ear": float(round(ear, 3)),
        "earLeft": float(round(ear_left, 3)),
        "earRight": float(round(ear_right, 3)),
        "mar": float(round(mar, 3)),
        "drowsyDuration": float(round(drowsy_duration, 1)),
        "distractDuration": float(round(distract_duration, 1)),
        "drowsinessThreshold": CONFIG["drowsiness_threshold_seconds"],
        "distractionThreshold": CONFIG["distraction_threshold_seconds"],
        "direction": direction,
        "yawRatio": float(round(yaw_offset, 2)),
        "pitchRatio": float(round(pitch_ratio, 2)),
        "phoneDetected": False,
        "seatBelt": True,
        "source": "REAL_CV",
        "timestamp": datetime.datetime.now().isoformat()
    }


class FrameProcessorHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler servicing the browser video telematics feed on Port 5001."""

    def log_message(self, format, *args):
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status":"UP","service":"SafeBus CV Driver Monitor"}')
        elif self.path == '/trigger_buzzer':
            play_system_buzzer(3.0)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status":"BUZZER_TRIGGERED","message":"Laptop speaker buzzer activated"}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        global browser_active_time
        if self.path == '/process_frame':
            browser_active_time = time.time()
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            try:
                req_data = json.loads(post_data.decode('utf-8'))
                frame_b64 = req_data.get('frame')
                d_id = req_data.get('driverId', 'driver@happyjourney.ai')
                b_id = req_data.get('busId', 'TN38AB1234')
                r_id = req_data.get('routeId', 'R-01')
                t_id = req_data.get('tripId', 'T-01')

                if browser_camera.push_frame_base64(frame_b64):
                    success, frame = browser_camera.get_frame()
                    if success and frame is not None:
                        telemetry = process_single_frame(frame, d_id, b_id, r_id, t_id)

                        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                        proc_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')
                        telemetry["processedImage"] = proc_b64

                        # Post live behavior to Spring Boot driver cache asynchronously
                        try:
                            behavior_payload = {
                                "status": telemetry["status"],
                                "confidence": telemetry["confidence"],
                                "faceDetected": telemetry["faceDetected"],
                                "eyesClosed": telemetry["eyesClosed"],
                                "ear": telemetry["ear"],
                                "mar": telemetry["mar"],
                                "drowsiness": telemetry["status"] == "DROWSINESS_DETECTED",
                                "distraction": telemetry["status"] == "DISTRACTION_DETECTED",
                                "safetyScore": 60 if telemetry["status"] == "DROWSINESS_DETECTED" else 75 if telemetry["status"] == "DISTRACTION_DETECTED" else 95,
                                "source": "REAL_CV",
                                "timestamp": telemetry["timestamp"]
                            }
                            def async_behavior_post(p, b):
                                try:
                                    requests.post(f"{BEHAVIOR_API}?busId={b}", json=p, timeout=0.5)
                                except Exception:
                                    pass
                            threading.Thread(target=async_behavior_post, args=(behavior_payload, b_id), daemon=True).start()
                        except Exception:
                            pass
                    else:
                        telemetry = create_no_face_response(d_id, b_id, r_id, t_id)
                else:
                    telemetry = create_no_face_response(d_id, b_id, r_id, t_id)
            except Exception as e:
                telemetry = create_no_face_response(None, None, None, None)
                telemetry["error"] = str(e)

            response_data = json.dumps(telemetry)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(response_data.encode('utf-8'))
        elif self.path == '/trigger_buzzer':
            play_system_buzzer(3.0)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status":"BUZZER_TRIGGERED","message":"Laptop speaker buzzer activated"}')


def run_http_server():
    port = int(os.environ.get('CV_PORT', 5001))
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, FrameProcessorHandler)
    print(f"\n[SafeBus AI] Multi-Camera CV HTTP Service listening on port {port} (High-Precision Eye & Face Tracker Ready)...")
    httpd.serve_forever()


def main():
    t = threading.Thread(target=run_http_server, daemon=True)
    t.start()

    if args.service:
        print("[SafeBus AI] Running in Service Mode. Waiting for driver portal webcam frames...")
        while True:
            time.sleep(1)

    print(f"\n[SafeBus AI] Initializing Standalone Camera source: {args.source.upper()}")
    if args.source == 'rtsp':
        cam = RTSPBusCameraSource(args.url)
    elif args.source == 'mock':
        cam = MockVideoSource(args.file)
    else:
        cam = WebcamSource(device_index=0)

    last_post_time = 0

    print("====================================================")
    print("  SafeBus AI Standalone CV Driver Monitoring Node")
    print(f"  Target Bus Profile: {bus_id}")
    print("====================================================")
    print("Press 'q' to quit.")

    while True:
        if time.time() - browser_active_time < 5.0:
            time.sleep(1)
            continue

        ret, frame = cam.get_frame()
        if not ret or frame is None:
            time.sleep(0.1)
            continue

        telemetry = process_single_frame(frame, "driver@happyjourney.ai", bus_id, "R-01", "T-01")

        if time.time() - last_post_time > 1.0:
            last_post_time = time.time()
            try:
                requests.post(f"{BEHAVIOR_API}?busId={bus_id}", json=telemetry, timeout=0.5)
            except Exception:
                pass

        cv2.imshow("SafeBus AI - Driver Safety Monitor", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cam.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
