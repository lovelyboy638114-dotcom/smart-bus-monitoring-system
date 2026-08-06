import enum
from datetime import datetime
from models import db

class SosStatus(enum.Enum):
    CREATED = "CREATED"
    POLICE_NOTIFIED = "POLICE_NOTIFIED"
    ADMIN_ACKNOWLEDGED = "ADMIN_ACKNOWLEDGED"
    RESOLVED = "RESOLVED"

class SosSeverity(enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class DeliveryStatus(enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"

class SosAlert(db.Model):
    __tablename__ = 'sos_alerts'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sos_id = db.Column(db.String(50), unique=True, index=True, nullable=False)
    bus_id = db.Column(db.String(50), index=True, nullable=False)
    driver_id = db.Column(db.String(100), nullable=False)
    driver_name = db.Column(db.String(150), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    speed = db.Column(db.Integer, nullable=False)
    route_name = db.Column(db.String(150), nullable=True)
    emergency_type = db.Column(db.String(150), nullable=False)
    
    status = db.Column(db.Enum(SosStatus), default=SosStatus.CREATED, index=True, nullable=False)
    severity = db.Column(db.Enum(SosSeverity), default=SosSeverity.CRITICAL, nullable=False)
    
    is_test = db.Column(db.Boolean, default=False, nullable=False)
    police_station_id = db.Column(db.Integer, nullable=True)
    parent_notified = db.Column(db.Boolean, default=False, nullable=False)
    admin_notified = db.Column(db.Boolean, default=False, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True, nullable=False)
    
    acknowledged_by = db.Column(db.String(100), nullable=True)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    
    resolved_by = db.Column(db.String(100), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    remarks = db.Column(db.String(255), nullable=True)
    
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.String(100), nullable=True)

class SosAuditLog(db.Model):
    __tablename__ = 'sos_audit_logs'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sos_id = db.Column(db.String(50), nullable=False, index=True)
    action = db.Column(db.String(100), nullable=False)
    performed_by = db.Column(db.String(150), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    remarks = db.Column(db.String(255), nullable=True)
    
    ip_address = db.Column(db.String(50), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    device = db.Column(db.String(100), nullable=True)

class NotificationLog(db.Model):
    __tablename__ = 'notification_logs'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sos_id = db.Column(db.String(50), nullable=False, index=True)
    recipient_type = db.Column(db.String(50), nullable=False) # Admin, Police, Parent
    recipient_name = db.Column(db.String(150), nullable=False)
    delivery_method = db.Column(db.String(50), nullable=False) # SocketIO, Push, MockSMS, MockEmail
    status = db.Column(db.Enum(DeliveryStatus), default=DeliveryStatus.PENDING, nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    error_message = db.Column(db.String(255), nullable=True)

class PoliceStation(db.Model):
    __tablename__ = 'police_stations'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    station_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(255), nullable=False)
