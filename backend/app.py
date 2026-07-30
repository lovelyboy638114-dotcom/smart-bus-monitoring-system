import json
import threading
import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS
import paho.mqtt.client as mqtt
import random

# Local modules
from database import get_db_connection, init_db
from ml_engine import BehaviorAnomalyDetector
from routing_engine import RoutingEngine

app = Flask(__name__)
CORS(app)

# Initialize engines
anomaly_detector = BehaviorAnomalyDetector()
routing_engine = RoutingEngine()

# Global Driver Behavior State Cache (holds live webcam CV classifications)
driver_behavior_cache = {
    "drowsiness": False,
    "mobileUsage": False,
    "yawning": False,
    "seatbelt": True,
    "smoking": False,
    "distraction": False,
    "speed": 45,
    "safetyScore": 85,
    "brakingEvents": 2
}

# MQTT configuration
MQTT_BROKER = "broker.hivemq.com"  # Free public MQTT broker
MQTT_PORT = 1883
MQTT_TOPIC = "safebus/telemetry"

# Ingest & Process Telemetry Logic
def process_telemetry_payload(data):
    """
    Core function to process telemetry logs, evaluate AI/ML anomaly,
    calculate geodesic geofence route deviations, and log alerts.
    """
    bus_id = data.get("busId")
    lat = float(data.get("latitude"))
    lng = float(data.get("longitude"))
    speed = int(data.get("speed"))
    accel = float(data.get("acceleration", 0.0))  # Deceleration in g's
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Log incoming telemetry
    cursor.execute('''
        INSERT INTO telemetry_logs (busId, latitude, longitude, speed, acceleration)
        VALUES (?, ?, ?, ?, ?)
    ''', (bus_id, lat, lng, speed, accel))
    
    # Get driver details for this bus
    cursor.execute('SELECT driver FROM buses WHERE id = ?', (bus_id,))
    bus_row = cursor.fetchone()
    driver_name = bus_row['driver'] if bus_row else 'Unknown Driver'
    
    # 2. Check geofence path deviations (geopy geodesic audit)
    deviated, distance_meters = routing_engine.check_route_deviation(bus_id, lat, lng)
    
    # 3. Check driving anomalies (scikit-learn Isolation Forest + rules)
    is_anomaly, score, reasons = anomaly_detector.analyze_telemetry(speed, accel)
    
    # 4. Trigger Alerts
    time_str = datetime_now_string()
    
    # Route Deviation Alert
    if deviated:
        cursor.execute('SELECT id FROM alerts WHERE type = ? AND bus = ? AND resolved = 0', ("Route Deviation Detected", bus_id))
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO alerts (type, severity, bus, driver, time, resolved)
                VALUES (?, ?, ?, ?, ?, 0)
            ''', ("Route Deviation Detected", "High", bus_id, driver_name, time_str))
            
    # Speeding or Braking Alerts
    if is_anomaly:
        for reason in reasons:
            severity = "High" if ("Harsh" in reason or "Overspeeding" in reason) else "Medium"
            # Prevent duplicate active warning triggers
            cursor.execute('SELECT id FROM alerts WHERE type = ? AND bus = ? AND resolved = 0', (reason, bus_id))
            if not cursor.fetchone():
                cursor.execute('''
                    INSERT INTO alerts (type, severity, bus, driver, time, resolved)
                    VALUES (?, ?, ?, ?, ?, 0)
                ''', (reason, severity, bus_id, driver_name, time_str))
                
    # 5. Update live Bus positioning cache
    cursor.execute('''
        UPDATE buses 
        SET speed = ?, latitude = ?, longitude = ?, deviation = ?
        WHERE id = ?
    ''', (speed, lat, lng, 1 if deviated else 0, bus_id))
    
    driver_behavior_cache["speed"] = speed
    
    conn.commit()
    conn.close()
    
    print(f"[Telemetry] Bus {bus_id} at ({lat}, {lng}): Speed={speed} km/h, Accel={accel}g. Deviation={deviated}, Anomalies={reasons}")

def datetime_now_string():
    from datetime import datetime
    return datetime.now().strftime("%I:%M %p")

# ==================== MQTT CLIENT THREAD ====================
def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT Broker with result code {rc}")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        print(f"Received MQTT Telemetry Payload: {payload}")
        process_telemetry_payload(payload)
    except Exception as e:
        print(f"Error parsing MQTT telemetry payload: {e}")

def run_mqtt_listener():
    mqtt_client = mqtt.Client()
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_forever()
    except Exception as e:
        print(f"MQTT Broker connection failed: {e}. Running HTTP telemetry ingest only.")

# Start MQTT Background Thread
mqtt_thread = threading.Thread(target=run_mqtt_listener, daemon=True)
mqtt_thread.start()

# ==================== FLASK API ROUTES ====================

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM accounts WHERE username = ? AND password = ? AND role = ?', (username, password, role))
    account = cursor.fetchone()
    conn.close()
    
    if account:
        return jsonify({
            "status": "success",
            "user": {
                "username": account['username'],
                "fullName": account['fullName'],
                "role": account['role'],
                "licenseNo": account['licenseNo'],
                "experienceYears": account['experienceYears'],
                "busRoute": account['busRoute']
            }
        })
    else:
        return jsonify({"status": "error", "message": "Invalid username or password"}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    role = data.get('role')
    username = data.get('username')
    password = data.get('password')
    fullName = data.get('fullName')
    licenseNo = data.get('licenseNo')
    experienceYears = data.get('experienceYears')
    busRoute = data.get('busRoute')
    phone = data.get('phone')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO accounts (role, username, password, fullName, licenseNo, experienceYears, busRoute, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (role, username, password, fullName, licenseNo, experienceYears, busRoute, phone))
        
        # If driver registered, update assigned bus driver telemetry details immediately
        if role == 'driver' and busRoute:
            cursor.execute('''
                UPDATE buses 
                SET driver = ?, driverLicense = ?, driverExperience = ?
                WHERE id = ?
            ''', (fullName, licenseNo, experienceYears, busRoute))
            
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Account registered successfully."})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"status": "error", "message": "Username already exists."}), 400

@app.route('/api/buses', methods=['GET'])
def get_buses():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM buses')
    buses = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(buses)

@app.route('/api/buses/location', methods=['GET'])
def get_buses_location():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM buses')
    rows = cursor.fetchall()
    conn.close()
    
    locations = []
    # Map database row IDs to React frontend display keys (Bus 1, Bus 2, Bus 3)
    id_mapping = {
        "TN38AB1234": "Bus 1",
        "TN38CD5678": "Bus 2",
        "TN38EP9012": "Bus 3"
    }
    
    for row in rows:
        db_id = row['id']
        mapped_id = id_mapping.get(db_id, db_id)
        
        locations.append({
            "id": mapped_id,
            "name": row['name'],
            "latitude": row['latitude'] if row['latitude'] is not None else 10.8801,
            "longitude": row['longitude'] if row['longitude'] is not None else 77.0224,
            "speed": row['speed'],
            "heading": random.randint(0, 360) if row['speed'] > 0 else 0,
            "status": row['status']
        })
    return jsonify(locations)

@app.route('/api/students', methods=['GET'])
def get_students():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM students')
    students = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(students)

@app.route('/api/students/profile', methods=['POST'])
def update_student_profile():
    data = request.json
    student_id = data.get('id')
    blood = data.get('bloodGroup')
    addr = data.get('address')
    notes = data.get('medicalNotes')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE students 
        SET bloodGroup = ?, address = ?, medicalNotes = ?
        WHERE id = ?
    ''', (blood, addr, notes, student_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Student profile updated."})

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM alerts ORDER BY id DESC')
    alerts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(alerts)

@app.route('/api/alerts/resolve', methods=['POST'])
def resolve_alert():
    alert_id = request.json.get('id')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE alerts SET resolved = 1 WHERE id = ?', (alert_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Alert resolved."})

@app.route('/api/alerts/trigger', methods=['POST'])
def custom_alert_trigger():
    data = request.json
    alert_type = data.get('type')
    severity = data.get('severity', 'Medium')
    bus_id = data.get('busId')
    driver = data.get('driver')
    time_str = datetime_now_string()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO alerts (type, severity, bus, driver, time, resolved)
        VALUES (?, ?, ?, ?, ?, 0)
    ''', (alert_type, severity, bus_id, driver, time_str))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Emergency SOS triggered."})

@app.route('/api/driver/behavior', methods=['GET', 'POST'])
def driver_behavior():
    global driver_behavior_cache
    if request.method == 'POST':
        data = request.json
        for key in ["drowsiness", "yawning", "distraction", "mobileUsage", "smoking", "seatbelt"]:
            if key in data:
                driver_behavior_cache[key] = data[key]
                
        # Calculate dynamic safety index based on CV alerts
        penalty = 0
        if driver_behavior_cache["drowsiness"]: penalty += 30
        if driver_behavior_cache["mobileUsage"]: penalty += 25
        if not driver_behavior_cache["seatbelt"]: penalty += 15
        if driver_behavior_cache["smoking"]: penalty += 20
        if driver_behavior_cache["yawning"]: penalty += 5
        if driver_behavior_cache["distraction"]: penalty += 15
        
        driver_behavior_cache["safetyScore"] = max(0, 95 - penalty)
        
        # Trigger Alerts in DB if triggered by CV
        conn = get_db_connection()
        cursor = conn.cursor()
        time_str = datetime_now_string()
        bus_id = "TN38AB1234"
        driver_name = "Ramesh Kumar"
        
        if driver_behavior_cache["drowsiness"]:
            cursor.execute('SELECT id FROM alerts WHERE type = ? AND bus = ? AND resolved = 0', ("Driver Drowsiness Alert", bus_id))
            if not cursor.fetchone():
                cursor.execute('INSERT INTO alerts (type, severity, bus, driver, time, resolved) VALUES (?, ?, ?, ?, ?, 0)',
                               ("Driver Drowsiness Alert", "High", bus_id, driver_name, time_str))
                               
        if driver_behavior_cache["yawning"]:
            cursor.execute('SELECT id FROM alerts WHERE type = ? AND bus = ? AND resolved = 0', ("Driver Yawning Detected", bus_id))
            if not cursor.fetchone():
                cursor.execute('INSERT INTO alerts (type, severity, bus, driver, time, resolved) VALUES (?, ?, ?, ?, ?, 0)',
                               ("Driver Yawning Detected", "Medium", bus_id, driver_name, time_str))
                               
        if driver_behavior_cache["distraction"]:
            cursor.execute('SELECT id FROM alerts WHERE type = ? AND bus = ? AND resolved = 0', ("Driver Distracted Gaze Alert", bus_id))
            if not cursor.fetchone():
                cursor.execute('INSERT INTO alerts (type, severity, bus, driver, time, resolved) VALUES (?, ?, ?, ?, ?, 0)',
                               ("Driver Distracted Gaze Alert", "Medium", bus_id, driver_name, time_str))
                               
        conn.commit()
        conn.close()
        
        return jsonify({"status": "success", "data": driver_behavior_cache})
    else:
        return jsonify(driver_behavior_cache)

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    role = data.get('role')
    username = data.get('username')
    new_password = data.get('newPassword')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM accounts WHERE role = ? AND username = ?', (role, username))
    account = cursor.fetchone()
    
    if not account:
        conn.close()
        return jsonify({"status": "error", "message": "Account not found."}), 404
        
    cursor.execute('UPDATE accounts SET password = ? WHERE role = ? AND username = ?', (new_password, role, username))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Password updated successfully."})

@app.route('/api/driver/messages', methods=['GET', 'POST'])
def handle_driver_messages():
    if request.method == 'POST':
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO driver_messages (studentId, studentName, status, message, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (data.get('studentId'), data.get('studentName'), data.get('status'), data.get('message'), data.get('timestamp')))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Announce dispatched."})
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM driver_messages ORDER BY id DESC')
        messages = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(messages)

@app.route('/api/admin/complaints', methods=['GET', 'POST'])
def handle_admin_complaints():
    if request.method == 'POST':
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO driver_complaints (parentName, studentName, driverName, busId, complaintText, timestamp, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (data.get('parentName'), data.get('studentName'), data.get('driverName'), data.get('busId'), data.get('complaintText'), data.get('timestamp'), data.get('status', 'Pending')))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Complaint logged."})
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM driver_complaints ORDER BY id DESC')
        complaints = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(complaints)

@app.route('/api/admin/complaints/resolve', methods=['POST'])
def resolve_complaint_endpoint():
    complaint_id = request.json.get('id')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE driver_complaints SET status = "Addressed" WHERE id = ?', (complaint_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Complaint resolved."})

@app.route('/api/telemetry', methods=['POST'])
def post_telemetry():
    """
    HTTP POST Fallback endpoint to ingest bus GPS and G-force accelerometer parameters
    """
    try:
        process_telemetry_payload(request.json)
        return jsonify({"status": "success", "message": "Telemetry processed."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

if __name__ == "__main__":
    init_db()
    print("Starting Flask Telemetry Server on http://localhost:5000")
    app.run(port=5000, debug=True)
