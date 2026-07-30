import json
import threading
import os
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
import paho.mqtt.client as mqtt
import random
from dotenv import load_dotenv
from sqlalchemy import text
from werkzeug.security import generate_password_hash, check_password_hash

# Configure structured logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] (%(name)s) %(message)s')
logger = logging.getLogger("safebus-app")

# Load environment configuration
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BACKEND_DIR, '.env.development')
if os.path.exists(env_path):
    logger.info(f"Loading environment settings from {env_path}")
    load_dotenv(env_path)
else:
    logger.info("Loading default system environment variables")
    load_dotenv()

# Database credentials
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "3306")
db_name = os.getenv("DB_NAME", "safebus")
db_user = os.getenv("DB_USER", "root")
db_pass = os.getenv("DB_PASSWORD", "")

# Initialize Flask Application
app = Flask(__name__)
CORS(app)

# Flask-SQLAlchemy configs
import urllib.parse
encoded_pass = urllib.parse.quote_plus(db_pass)
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{db_user}:{encoded_pass}@{db_host}:{db_port}/{db_name}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Connection Pool Configurations
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'max_overflow': 20,
    'pool_recycle': 3600,
    'pool_timeout': 30
}

# Bind SQLAlchemy models
from models import db, Account, Bus, Student, Alert, TelemetryLog, DriverMessage, DriverComplaint
db.init_app(app)

# Local modules
from ml_engine import BehaviorAnomalyDetector
from routing_engine import RoutingEngine

# Initialize processing engines
anomaly_detector = BehaviorAnomalyDetector()
routing_engine = RoutingEngine()

# Global Driver Behavior State Cache (webcam classifications)
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
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "safebus/telemetry"

# Startup Connection Health Check
def run_startup_health_check():
    """
    Verifies that the database pool initializes and the 7 core tables are present.
    """
    logger.info("Auditing MySQL database connection health...")
    with app.app_context():
        try:
            db.session.execute(text("SELECT 1"))
            logger.info("MySQL connection established successfully.")

            # Inspect database tables
            inspector = db.inspect(db.engine)
            existing_tables = inspector.get_table_names()
            required_tables = ['accounts', 'buses', 'students', 'alerts', 'telemetry_logs', 'driver_messages', 'driver_complaints']
            
            missing_tables = [t for t in required_tables if t not in existing_tables]
            if missing_tables:
                raise Exception(f"Missing core tables: {', '.join(missing_tables)}")
            
            logger.info("All 7 core tables found. Database initialization is healthy.")
            return True
        except Exception as e:
            logger.critical(f"Startup Health Check failed: {e}. Aborting server boot.")
            return False

# Telemetry Processing Pipeline
def process_telemetry_payload(data):
    """
    Processes telemetry metrics, audits route deviations, evaluates anomalies,
    inserts records, and fires warnings.
    """
    bus_id = data.get("busId")
    lat = float(data.get("latitude"))
    lng = float(data.get("longitude"))
    speed = int(data.get("speed"))
    accel = float(data.get("acceleration", 0.0))

    with app.app_context():
        try:
            # 1. Log incoming telemetry
            log = TelemetryLog(
                busId=bus_id,
                latitude=lat,
                longitude=lng,
                speed=speed,
                acceleration=accel
            )
            db.session.add(log)

            # Get driver details for this bus
            bus_item = db.session.query(Bus).filter(Bus.id == bus_id).first()
            driver_name = bus_item.driver if bus_item else 'Unknown Driver'

            # 2. Check geofence path deviations
            deviated, distance_meters = routing_engine.check_route_deviation(bus_id, lat, lng)

            # 3. Check driving anomalies
            is_anomaly, score, reasons = anomaly_detector.analyze_telemetry(speed, accel)

            time_str = datetime_now_string()

            # 4. Trigger Alerts
            if deviated:
                active_dev = db.session.query(Alert).filter(
                    Alert.type == "Route Deviation Detected",
                    Alert.bus == bus_id,
                    Alert.resolved == 0
                ).first()
                
                if not active_dev:
                    alert = Alert(
                        type="Route Deviation Detected",
                        severity="High",
                        bus=bus_id,
                        driver=driver_name,
                        time=time_str,
                        resolved=0
                    )
                    db.session.add(alert)
                    logger.info(f"Logged Route Deviation Alert for Bus {bus_id}")

            if is_anomaly:
                for reason in reasons:
                    severity = "High" if ("Harsh" in reason or "Overspeeding" in reason) else "Medium"
                    active_anomaly = db.session.query(Alert).filter(
                        Alert.type == reason,
                        Alert.bus == bus_id,
                        Alert.resolved == 0
                    ).first()
                    
                    if not active_anomaly:
                        alert = Alert(
                            type=reason,
                            severity=severity,
                            bus=bus_id,
                            driver=driver_name,
                            time=time_str,
                            resolved=0
                        )
                        db.session.add(alert)
                        logger.info(f"Logged Telemetry Anomaly Alert ({reason}) for Bus {bus_id}")

            # 5. Update live Bus positioning cache
            if bus_item:
                bus_item.speed = speed
                bus_item.latitude = lat
                bus_item.longitude = lng
                bus_item.deviation = 1 if deviated else 0

            driver_behavior_cache["speed"] = speed

            db.session.commit()
            logger.info(f"[Telemetry Ingestion] Bus {bus_id} processed successfully.")
        except Exception as e:
            db.session.rollback()
            logger.error(f"[Telemetry Ingestion Error] Failed to ingest telemetry for Bus {bus_id}: {e}")

def datetime_now_string():
    from datetime import datetime
    return datetime.now().strftime("%I:%M %p")

# ==================== MQTT CLIENT THREAD ====================
def on_connect(client, userdata, flags, rc):
    logger.info(f"MQTT Listener connected with response code {rc}")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        logger.info(f"MQTT message parsed: {payload}")
        process_telemetry_payload(payload)
    except Exception as e:
        logger.error(f"Failed to parse incoming MQTT payload: {e}")

def run_mqtt_listener():
    mqtt_client = mqtt.Client()
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_forever()
    except Exception as e:
        logger.warning(f"MQTT Broker offline ({e}). Running HTTP REST telematics only.")

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
    
    try:
        account = db.session.query(Account).filter(
            Account.username == username,
            Account.role == role
        ).first()
        
        if account and check_password_hash(account.password, password):
            return jsonify({
                "status": "success",
                "user": {
                    "username": account.username,
                    "fullName": account.fullName,
                    "role": account.role,
                    "licenseNo": account.licenseNo,
                    "experienceYears": account.experienceYears,
                    "busRoute": account.busRoute
                }
            })
        else:
            return jsonify({"status": "error", "message": "Invalid username or password"}), 401
    except Exception as e:
        logger.error(f"Login database fetch failure: {e}")
        return jsonify({"status": "error", "message": "Database query error"}), 500

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
    
    try:
        # Check if username exists
        exists = db.session.query(Account).filter(Account.username == username).first()
        if exists:
            return jsonify({"status": "error", "message": "Username already exists."}), 400

        hashed_password = generate_password_hash(password)
        account = Account(
            role=role,
            username=username,
            password=hashed_password,
            fullName=fullName,
            licenseNo=licenseNo,
            experienceYears=experienceYears,
            busRoute=busRoute,
            phone=phone
        )
        db.session.add(account)

        # Update driver settings in buses if assigned
        if role == 'driver' and busRoute:
            bus_item = db.session.query(Bus).filter(Bus.id == busRoute).first()
            if bus_item:
                bus_item.driver = fullName
                bus_item.driverLicense = licenseNo
                bus_item.driverExperience = experienceYears

        db.session.commit()
        return jsonify({"status": "success", "message": "Account registered successfully."})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration failure: {e}")
        return jsonify({"status": "error", "message": "Registration failed."}), 500

@app.route('/api/buses', methods=['GET'])
def get_buses():
    try:
        rows = db.session.query(Bus).all()
        buses = []
        for row in rows:
            buses.append({
                "id": row.id,
                "name": row.name,
                "route": row.route,
                "driver": row.driver,
                "driverLicense": row.driverLicense,
                "driverExperience": row.driverExperience,
                "speed": row.speed,
                "maxSpeed": row.maxSpeed,
                "status": row.status,
                "eta": row.eta,
                "nextStop": row.nextStop,
                "studentsOnboard": row.studentsOnboard,
                "latitude": row.latitude,
                "longitude": row.longitude,
                "deviation": row.deviation
            })
        return jsonify(buses)
    except Exception as e:
        logger.error(f"Fetch buses failure: {e}")
        return jsonify([]), 500

@app.route('/api/buses/location', methods=['GET'])
def get_buses_location():
    try:
        rows = db.session.query(Bus).all()
        locations = []
        id_mapping = {
            "TN38AB1234": "Bus 1",
            "TN38CD5678": "Bus 2",
            "TN38EP9012": "Bus 3"
        }
        for row in rows:
            db_id = row.id
            mapped_id = id_mapping.get(db_id, db_id)
            locations.append({
                "id": mapped_id,
                "name": row.name,
                "latitude": row.latitude if row.latitude is not None else 10.8801,
                "longitude": row.longitude if row.longitude is not None else 77.0224,
                "speed": row.speed,
                "heading": random.randint(0, 360) if row.speed > 0 else 0,
                "status": row.status
            })
        return jsonify(locations)
    except Exception as e:
        logger.error(f"Fetch bus locations failure: {e}")
        return jsonify([]), 500

@app.route('/api/students', methods=['GET'])
def get_students():
    try:
        rows = db.session.query(Student).all()
        students = []
        for row in rows:
            students.append({
                "id": row.id,
                "name": row.name,
                "rollNo": row.rollNo,
                "class": row.class_name,
                "busId": row.busId,
                "boarded": row.boarded,
                "boardedTime": row.boardedTime,
                "reachedSchool": row.reachedSchool,
                "boardedReturn": row.boardedReturn,
                "reachedHome": row.reachedHome,
                "status": row.status,
                "parentName": row.parentName,
                "parentPhone": row.parentPhone,
                "bloodGroup": row.bloodGroup,
                "address": row.address,
                "medicalNotes": row.medicalNotes
            })
        return jsonify(students)
    except Exception as e:
        logger.error(f"Fetch students failure: {e}")
        return jsonify([]), 500

@app.route('/api/students/profile', methods=['POST'])
def update_student_profile():
    data = request.json
    student_id = data.get('id')
    blood = data.get('bloodGroup')
    addr = data.get('address')
    notes = data.get('medicalNotes')
    
    try:
        student = db.session.query(Student).filter(Student.id == student_id).first()
        if student:
            student.bloodGroup = blood
            student.address = addr
            student.medicalNotes = notes
            db.session.commit()
            return jsonify({"status": "success", "message": "Student profile updated."})
        else:
            return jsonify({"status": "error", "message": "Student not found."}), 404
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update student failure: {e}")
        return jsonify({"status": "error", "message": "Update failed."}), 500

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    try:
        rows = db.session.query(Alert).order_by(Alert.id.desc()).all()
        alerts = []
        for row in rows:
            alerts.append({
                "id": row.id,
                "type": row.type,
                "severity": row.severity,
                "bus": row.bus,
                "driver": row.driver,
                "time": row.time,
                "resolved": row.resolved
            })
        return jsonify(alerts)
    except Exception as e:
        logger.error(f"Fetch alerts failure: {e}")
        return jsonify([]), 500

@app.route('/api/alerts/resolve', methods=['POST'])
def resolve_alert():
    alert_id = request.json.get('id')
    try:
        alert = db.session.query(Alert).filter(Alert.id == alert_id).first()
        if alert:
            alert.resolved = 1
            db.session.commit()
            return jsonify({"status": "success", "message": "Alert resolved."})
        else:
            return jsonify({"status": "error", "message": "Alert not found."}), 404
    except Exception as e:
        db.session.rollback()
        logger.error(f"Resolve alert failure: {e}")
        return jsonify({"status": "error", "message": "Query failed."}), 500

@app.route('/api/alerts/trigger', methods=['POST'])
def custom_alert_trigger():
    data = request.json
    alert_type = data.get('type')
    severity = data.get('severity', 'Medium')
    bus_id = data.get('busId')
    driver = data.get('driver')
    time_str = datetime_now_string()
    
    try:
        alert = Alert(
            type=alert_type,
            severity=severity,
            bus=bus_id,
            driver=driver,
            time=time_str,
            resolved=0
        )
        db.session.add(alert)
        db.session.commit()
        return jsonify({"status": "success", "message": "Emergency SOS triggered."})
    except Exception as e:
        db.session.rollback()
        logger.error(f"SOS alert insert failure: {e}")
        return jsonify({"status": "error", "message": "SOS alert creation failed."}), 500

@app.route('/api/driver/behavior', methods=['GET', 'POST'])
def driver_behavior():
    global driver_behavior_cache
    if request.method == 'POST':
        data = request.json
        for key in ["drowsiness", "yawning", "distraction", "mobileUsage", "smoking", "seatbelt"]:
            if key in data:
                driver_behavior_cache[key] = data[key]
                
        # Calculate score dynamically
        penalty = 0
        if driver_behavior_cache["drowsiness"]: penalty += 30
        if driver_behavior_cache["mobileUsage"]: penalty += 25
        if not driver_behavior_cache["seatbelt"]: penalty += 15
        if driver_behavior_cache["smoking"]: penalty += 20
        if driver_behavior_cache["yawning"]: penalty += 5
        if driver_behavior_cache["distraction"]: penalty += 15
        
        driver_behavior_cache["safetyScore"] = max(0, 95 - penalty)
        
        try:
            time_str = datetime_now_string()
            bus_id = "TN38AB1234"
            driver_name = "Ramesh Kumar"
            
            if driver_behavior_cache["drowsiness"]:
                exists = db.session.query(Alert).filter(Alert.type == "Driver Drowsiness Alert", Alert.bus == bus_id, Alert.resolved == 0).first()
                if not exists:
                    alert = Alert(type="Driver Drowsiness Alert", severity="High", bus=bus_id, driver=driver_name, time=time_str, resolved=0)
                    db.session.add(alert)
                    
            if driver_behavior_cache["yawning"]:
                exists = db.session.query(Alert).filter(Alert.type == "Driver Yawning Detected", Alert.bus == bus_id, Alert.resolved == 0).first()
                if not exists:
                    alert = Alert(type="Driver Yawning Detected", severity="Medium", bus=bus_id, driver=driver_name, time=time_str, resolved=0)
                    db.session.add(alert)
                    
            if driver_behavior_cache["distraction"]:
                exists = db.session.query(Alert).filter(Alert.type == "Driver Distracted Gaze Alert", Alert.bus == bus_id, Alert.resolved == 0).first()
                if not exists:
                    alert = Alert(type="Driver Distracted Gaze Alert", severity="Medium", bus=bus_id, driver=driver_name, time=time_str, resolved=0)
                    db.session.add(alert)
                    
            db.session.commit()
        except Exception as db_err:
            db.session.rollback()
            logger.error(f"Behavior database warnings log error: {db_err}")
            
        return jsonify({"status": "success", "data": driver_behavior_cache})
    else:
        return jsonify(driver_behavior_cache)

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    role = data.get('role')
    username = data.get('username')
    new_password = data.get('newPassword')
    
    try:
        account = db.session.query(Account).filter(
            Account.role == role,
            Account.username == username
        ).first()
        
        if not account:
            return jsonify({"status": "error", "message": "Account not found."}), 404
            
        hashed_password = generate_password_hash(new_password)
        account.password = hashed_password
        db.session.commit()
        return jsonify({"status": "success", "message": "Password updated successfully."})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Forgot password DB transaction failed: {e}")
        return jsonify({"status": "error", "message": "Forgot password failed."}), 500

@app.route('/api/driver/messages', methods=['GET', 'POST'])
def handle_driver_messages():
    if request.method == 'POST':
        data = request.json
        try:
            msg = DriverMessage(
                studentId=data.get('studentId'),
                studentName=data.get('studentName'),
                status=data.get('status'),
                message=data.get('message'),
                timestamp=data.get('timestamp')
            )
            db.session.add(msg)
            db.session.commit()
            return jsonify({"status": "success", "message": "Announce dispatched."})
        except Exception as e:
            db.session.rollback()
            logger.error(f"Log message failure: {e}")
            return jsonify({"status": "error", "message": "Log failed."}), 500
    else:
        try:
            rows = db.session.query(DriverMessage).order_by(DriverMessage.id.desc()).all()
            messages = []
            for row in rows:
                messages.append({
                    "id": row.id,
                    "studentId": row.studentId,
                    "studentName": row.studentName,
                    "status": row.status,
                    "message": row.message,
                    "timestamp": row.timestamp
                })
            return jsonify(messages)
        except Exception as e:
            logger.error(f"Fetch messages failure: {e}")
            return jsonify([]), 500

@app.route('/api/admin/complaints', methods=['GET', 'POST'])
def handle_admin_complaints():
    if request.method == 'POST':
        data = request.json
        try:
            complaint = DriverComplaint(
                parentName=data.get('parentName'),
                studentName=data.get('studentName'),
                driverName=data.get('driverName'),
                busId=data.get('busId'),
                complaintText=data.get('complaintText'),
                timestamp=data.get('timestamp'),
                status=data.get('status', 'Pending')
            )
            db.session.add(complaint)
            db.session.commit()
            return jsonify({"status": "success", "message": "Complaint logged."})
        except Exception as e:
            db.session.rollback()
            logger.error(f"Log complaint failure: {e}")
            return jsonify({"status": "error", "message": "Log failed."}), 500
    else:
        try:
            rows = db.session.query(DriverComplaint).order_by(DriverComplaint.id.desc()).all()
            complaints = []
            for row in rows:
                complaints.append({
                    "id": row.id,
                    "parentName": row.parentName,
                    "studentName": row.studentName,
                    "driverName": row.driverName,
                    "busId": row.busId,
                    "complaintText": row.complaintText,
                    "timestamp": row.timestamp,
                    "status": row.status
                })
            return jsonify(complaints)
        except Exception as e:
            logger.error(f"Fetch complaints failure: {e}")
            return jsonify([]), 500

@app.route('/api/admin/complaints/resolve', methods=['POST'])
def resolve_complaint_endpoint():
    complaint_id = request.json.get('id')
    try:
        complaint = db.session.query(DriverComplaint).filter(DriverComplaint.id == complaint_id).first()
        if complaint:
            complaint.status = "Addressed"
            db.session.commit()
            return jsonify({"status": "success", "message": "Complaint resolved."})
        else:
            return jsonify({"status": "error", "message": "Complaint not found."}), 404
    except Exception as e:
        db.session.rollback()
        logger.error(f"Resolve complaint failure: {e}")
        return jsonify({"status": "error", "message": "Query failed."}), 500

@app.route('/api/telemetry', methods=['POST'])
def post_telemetry():
    try:
        process_telemetry_payload(request.json)
        return jsonify({"status": "success", "message": "Telemetry processed."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

if __name__ == "__main__":
    # Audit connection pooling and tables before starting Flask
    if run_startup_health_check():
        logger.info("Starting Flask Telemetry Server on http://localhost:5000")
        app.run(port=5000, debug=True)
    else:
        logger.critical("Database health check failed. System shut down.")
        os._exit(1)
