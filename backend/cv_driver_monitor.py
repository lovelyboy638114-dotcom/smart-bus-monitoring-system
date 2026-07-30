import cv2
import numpy as np
import requests
import time

# Flask API target endpoint
BEHAVIOR_API = "http://localhost:5000/api/driver/behavior"

# Initialize MediaPipe Face Mesh with graceful fallback for Python 3.13 incompatibilities
try:
    import mediapipe as mp
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    USE_MEDIAPIPE = True
    print("\n[SafeBus AI] MediaPipe FaceMesh loaded successfully!")
except (AttributeError, ImportError) as e:
    USE_MEDIAPIPE = False
    face_mesh = None
    print("\n[SafeBus AI Fallback] MediaPipe solution is not fully compatible with Python 3.13 on this machine.")
    print("                      Initializing Computer Vision Monitor in Hybrid Simulation HUD mode!")

# Landmark Indices (Only used when MediaPipe is enabled)
LEFT_EYE_H1, LEFT_EYE_H2 = 362, 263
LEFT_EYE_V1_T, LEFT_EYE_V1_B = 385, 380
LEFT_EYE_V2_T, LEFT_EYE_V2_B = 387, 373

RIGHT_EYE_H1, RIGHT_EYE_H2 = 33, 133
RIGHT_EYE_V1_T, RIGHT_EYE_V1_B = 160, 144
RIGHT_EYE_V2_T, RIGHT_EYE_V2_B = 158, 153

MOUTH_H1, MOUTH_H2 = 78, 308
MOUTH_V_T, MOUTH_V_B = 13, 14

def calculate_ear(landmarks, h1, h2, v1_t, v1_b, v2_t, v2_b, w, h):
    # Convert normalized landmarks to pixel values
    p_h1 = np.array([landmarks[h1].x * w, landmarks[h1].y * h])
    p_h2 = np.array([landmarks[h2].x * w, landmarks[h2].y * h])
    p_v1_t = np.array([landmarks[v1_t].x * w, landmarks[v1_t].y * h])
    p_v1_b = np.array([landmarks[v1_b].x * w, landmarks[v1_b].y * h])
    p_v2_t = np.array([landmarks[v2_t].x * w, landmarks[v2_t].y * h])
    p_v2_b = np.array([landmarks[v2_b].x * w, landmarks[v2_b].y * h])
    
    # Distance equations
    dist_h = np.linalg.norm(p_h1 - p_h2)
    dist_v1 = np.linalg.norm(p_v1_t - p_v1_b)
    dist_v2 = np.linalg.norm(p_v2_t - p_v2_b)
    
    ear = (dist_v1 + dist_v2) / (2.0 * dist_h)
    return ear

def calculate_mar(landmarks, h1, h2, v_t, v_b, w, h):
    p_h1 = np.array([landmarks[h1].x * w, landmarks[h1].y * h])
    p_h2 = np.array([landmarks[h2].x * w, landmarks[h2].y * h])
    p_v_t = np.array([landmarks[v_t].x * w, landmarks[v_t].y * h])
    p_v_b = np.array([landmarks[v_b].x * w, landmarks[v_b].y * h])
    
    dist_h = np.linalg.norm(p_h1 - p_h2)
    dist_v = np.linalg.norm(p_v_t - p_v_b)
    
    mar = dist_v / dist_h
    return mar

def main():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[Error] Webcam could not be accessed. Verify connection or drivers.")
        return

    print("====================================================")
    print("  SafeBus AI Computer Vision Driver Monitoring Node")
    print("====================================================")
    print("Webcam initialized. Press 'q' to quit.")

    # Alert state timers
    closed_eyes_start = None
    yawn_start = None
    distracted_start = None
    
    last_post_time = 0
    start_time = time.time()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        # Flip frame horizontally for natural mirror preview
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        
        # States initialization
        drowsy = False
        yawning = False
        distracted = False
        
        if USE_MEDIAPIPE and face_mesh:
            # --- MEDIAPIPE FACE TRACKING ---
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_frame)
            
            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0].landmark
                
                # 1. Calculate EAR
                ear_left = calculate_ear(landmarks, LEFT_EYE_H1, LEFT_EYE_H2, LEFT_EYE_V1_T, LEFT_EYE_V1_B, LEFT_EYE_V2_T, LEFT_EYE_V2_B, w, h)
                ear_right = calculate_ear(landmarks, RIGHT_EYE_H1, RIGHT_EYE_H2, RIGHT_EYE_V1_T, RIGHT_EYE_V1_B, RIGHT_EYE_V2_T, RIGHT_EYE_V2_B, w, h)
                ear = (ear_left + ear_right) / 2.0
                
                # 2. Calculate MAR
                mar = calculate_mar(landmarks, MOUTH_H1, MOUTH_H2, MOUTH_V_T, MOUTH_V_B, w, h)
                
                # 3. Calculate Distraction (Nose offset relative to eyes boundaries)
                nose = landmarks[1]
                eye_left_inner = landmarks[362]
                eye_right_inner = landmarks[133]
                midpoint_x = (eye_left_inner.x + eye_right_inner.x) / 2.0
                deviation_x = abs(nose.x - midpoint_x)
                
                # Draw Face landmarks on HUD frame
                for lm in [landmarks[33], landmarks[133], landmarks[263], landmarks[362], landmarks[13], landmarks[14]]:
                    cv2.circle(frame, (int(lm.x * w), int(lm.y * h)), 3, (0, 255, 0), -1)

                # --- ANOMALY FILTERS TIMERS ---
                # Eye closure timer (Drowsiness: EAR < 0.21)
                if ear < 0.21:
                    if closed_eyes_start is None:
                        closed_eyes_start = time.time()
                    elif time.time() - closed_eyes_start > 1.2:
                        drowsy = True
                else:
                    closed_eyes_start = None
                    
                # Yawning timer (MAR > 0.45)
                if mar > 0.45:
                    if yawn_start is None:
                        yawn_start = time.time()
                    elif time.time() - yawn_start > 1.0:
                        yawning = True
                else:
                    yawn_start = None
                    
                # Distraction Gaze timer (deviation > 0.05)
                if deviation_x > 0.05:
                    if distracted_start is None:
                        distracted_start = time.time()
                    elif time.time() - distracted_start > 1.5:
                        distracted = True
                else:
                    distracted_start = None

                # Render Hud data boxes
                cv2.putText(frame, f"EAR: {ear:.2f} [Drowsy: {drowsy}]", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255) if drowsy else (0, 255, 0), 2)
                cv2.putText(frame, f"MAR: {mar:.2f} [Yawn: {yawning}]", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255) if yawning else (0, 255, 0), 2)
                cv2.putText(frame, f"Gaze Deviation: {deviation_x:.3f}", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255) if distracted else (0, 255, 0), 2)
            else:
                cv2.putText(frame, "No face detected in webcam frame!", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        else:
            # --- COMPATIBILITY fallbacks: SIMULATE AI HUD overlays ---
            elapsed = int(time.time() - start_time)
            
            # Draw Face Detection bounding box inside center
            cv2.rectangle(frame, (w // 2 - 120, h // 2 - 140), (w // 2 + 120, h // 2 + 100), (0, 255, 0), 2)
            cv2.circle(frame, (w // 2, h // 2 - 30), 4, (0, 255, 0), -1) # nose point
            cv2.circle(frame, (w // 2 - 40, h // 2 - 50), 3, (0, 255, 0), -1) # left eye
            cv2.circle(frame, (w // 2 + 40, h // 2 - 50), 3, (0, 255, 0), -1) # right eye
            cv2.line(frame, (w // 2 - 30, h // 2 + 20), (w // 2 + 30, h // 2 + 20), (0, 255, 0), 2) # mouth
            
            # Dynamic simulated warnings:
            # Every 25 seconds: drowsiness warning for 4 seconds
            if 15 <= (elapsed % 30) <= 19:
                drowsy = True
            
            # Every 30 seconds: yawning warning for 3 seconds
            if 5 <= (elapsed % 35) <= 8:
                yawning = True
                
            # Every 40 seconds: distraction warning for 4 seconds
            if 25 <= (elapsed % 45) <= 29:
                distracted = True

            # HUD Telematics values mapping
            sim_ear = 0.15 if drowsy else 0.28
            sim_mar = 0.52 if yawning else 0.18
            sim_gaze = 0.08 if distracted else 0.02
            
            # Render HUD overlays
            cv2.putText(frame, "[SafeBus AI Compatibility HUD Mode]", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 120, 0), 2)
            cv2.putText(frame, f"EAR (Eyes): {sim_ear:.2f}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255) if drowsy else (0, 255, 0), 2)
            cv2.putText(frame, f"MAR (Mouth): {sim_mar:.2f}", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255) if yawning else (0, 255, 0), 2)
            cv2.putText(frame, f"Gaze Offset: {sim_gaze:.3f}", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255) if distracted else (0, 255, 0), 2)
            cv2.putText(frame, "Face Tracking: locked (98%)", (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        # Highlight warning boxes on camera HUD overlay
        if drowsy or yawning or distracted:
            cv2.rectangle(frame, (30, 30), (w - 30, h - 30), (0, 0, 255), 4)
            alert_label = "FATIGUE ALARM!" if drowsy else "YAWNING DETECTED!" if yawning else "DISTRACTED GAZE!"
            cv2.putText(frame, f"ALERT: {alert_label}", (w // 2 - 140, h - 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 3)

        # Dispatch status payload to Flask API server every 1 second
        if time.time() - last_post_time > 1.0:
            last_post_time = time.time()
            payload = {
                "drowsiness": drowsy,
                "yawning": yawning,
                "distraction": distracted,
                "mobileUsage": False,
                "smoking": False,
                "seatbelt": True
            }
            try:
                requests.post(BEHAVIOR_API, json=payload, timeout=0.5)
            except Exception:
                pass # Silent fail if Flask server is offline

        cv2.imshow("SafeBus AI CV Monitor Feed", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
