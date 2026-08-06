import logging
from flask import Flask
from flask_socketio import SocketIO
from models import db
from sos.models import PoliceStation
from sos.routes import sos_blueprint
from sos.notification_worker import start_worker_thread
from sos.scheduler import start_escalation_scheduler

logger = logging.getLogger("safebus-sos-startup")

# Global SocketIO instance
socketio = SocketIO(cors_allowed_origins="*")

def seed_police_stations():
    """
    Seeds Coimbatore police stations if table is empty.
    """
    try:
        count = db.session.query(PoliceStation).count()
        if count == 0:
            logger.info("Database contains zero police stations. Seeding default Coimbatore emergency nodes...")
            stations = [
                PoliceStation(
                    station_name="Othakkalmandapam Police Station",
                    phone="+91 422 2636222",
                    email="othakkalmandapam-ps@tn.gov.in",
                    latitude=10.8872,
                    longitude=77.0253,
                    address="Othakkalmandapam, Coimbatore, Tamil Nadu 641032"
                ),
                PoliceStation(
                    station_name="Madukkarai Police Station",
                    phone="+91 422 2622212",
                    email="madukkarai-ps@tn.gov.in",
                    latitude=10.9045,
                    longitude=76.9642,
                    address="Madukkarai, Coimbatore, Tamil Nadu 641105"
                ),
                PoliceStation(
                    station_name="Chettipalayam Police Station",
                    phone="+91 422 2636100",
                    email="chettipalayam-ps@tn.gov.in",
                    latitude=10.9238,
                    longitude=77.0394,
                    address="Chettipalayam, Coimbatore, Tamil Nadu 641201"
                )
            ]
            db.session.add_all(stations)
            db.session.commit()
            logger.info("Successfully seeded 3 Coimbatore police stations.")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to seed police stations: {e}")

def initialize_sos(app: Flask):
    """
    Centralized initialization entry point for the SOS Emergency Response System module.
    Registers blueprints, configures SocketIO, spawns the consumer threads, and seeds resources.
    """
    logger.info("Initializing SOS Emergency Response Module...")
    
    # 1. Register REST blueprint
    app.register_blueprint(sos_blueprint, url_prefix='/api')
    logger.info("Registered SOS blueprint under prefix '/api'")
    
    # 2. Bind SocketIO to Flask app extension
    socketio.init_app(app)
    logger.info("Flask-SocketIO successfully bound to application context.")
    
    # 3. Seed Police Stations
    with app.app_context():
        seed_police_stations()
        
    # 4. Launch Notification Worker Thread & Progressive Escalation Scheduler if not in TESTING mode
    if not app.config.get('TESTING'):
        start_worker_thread(app)
        start_escalation_scheduler(app)
    
    logger.info("SOS Emergency Response System initialized successfully!")
