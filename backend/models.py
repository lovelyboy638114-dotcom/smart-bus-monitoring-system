from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import CheckConstraint

db = SQLAlchemy()

class Account(db.Model):
    __tablename__ = 'accounts'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    role = db.Column(db.String(50), nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    fullName = db.Column(db.String(150), nullable=False)
    licenseNo = db.Column(db.String(100), nullable=True)
    experienceYears = db.Column(db.Integer, nullable=True)
    busRoute = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class Bus(db.Model):
    __tablename__ = 'buses'
    
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    route = db.Column(db.String(150), nullable=False)
    driver = db.Column(db.String(150), nullable=False)
    driverLicense = db.Column(db.String(100), nullable=True)
    driverExperience = db.Column(db.Integer, nullable=True)
    speed = db.Column(db.Integer, default=0)
    maxSpeed = db.Column(db.Integer, default=60)
    status = db.Column(db.String(50), default='Idle')
    eta = db.Column(db.String(50), nullable=True)
    nextStop = db.Column(db.String(150), nullable=True)
    studentsOnboard = db.Column(db.Integer, default=0)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    deviation = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    __table_args__ = (
        CheckConstraint(status.in_(['Running', 'Stopped', 'Delayed', 'On Route', 'Idle']), name='chk_bus_status'),
    )

class Student(db.Model):
    __tablename__ = 'students'
    
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    rollNo = db.Column(db.String(50), nullable=False)
    class_name = db.Column(db.String(50), name='class', nullable=False) # class is a reserved word
    busId = db.Column(db.String(50), db.ForeignKey('buses.id', ondelete='SET NULL'), nullable=True)
    boarded = db.Column(db.Integer, default=0)
    boardedTime = db.Column(db.String(50), nullable=True)
    reachedSchool = db.Column(db.Integer, default=0)
    boardedReturn = db.Column(db.Integer, default=0)
    reachedHome = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default='Not Started')
    parentName = db.Column(db.String(150), nullable=True)
    parentPhone = db.Column(db.String(50), nullable=True)
    bloodGroup = db.Column(db.String(20), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    medicalNotes = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class Alert(db.Model):
    __tablename__ = 'alerts'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    type = db.Column(db.String(150), nullable=False)
    severity = db.Column(db.String(50), nullable=False)
    bus = db.Column(db.String(50), nullable=True)
    driver = db.Column(db.String(150), nullable=True)
    time = db.Column(db.String(50), nullable=True)
    resolved = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    __table_args__ = (
        db.Index('idx_alerts_bus_resolved', 'bus', 'resolved'),
    )

class TelemetryLog(db.Model):
    __tablename__ = 'telemetry_logs'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    busId = db.Column(db.String(50), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    speed = db.Column(db.Integer, nullable=True)
    acceleration = db.Column(db.Float, nullable=True)
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    __table_args__ = (
        db.Index('idx_telemetry_bus_time', 'busId', 'timestamp'),
    )

class DriverMessage(db.Model):
    __tablename__ = 'driver_messages'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    studentId = db.Column(db.String(50), nullable=True)
    studentName = db.Column(db.String(150), nullable=True)
    status = db.Column(db.String(50), nullable=True)
    message = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.String(50), nullable=True)
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class DriverComplaint(db.Model):
    __tablename__ = 'driver_complaints'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    parentName = db.Column(db.String(150), nullable=True)
    studentName = db.Column(db.String(150), nullable=True)
    driverName = db.Column(db.String(150), nullable=True)
    busId = db.Column(db.String(50), nullable=True)
    complaintText = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(50), default='Pending')
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())


# ==========================================================
# STAGE 2 FEATURE EXPANSION MODELS (PLACEHOLDERS)
# ==========================================================
"""
class Parent(db.Model):
    __tablename__ = 'parents'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    username = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class Stop(db.Model):
    __tablename__ = 'stops'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class Route(db.Model):
    __tablename__ = 'routes'
    id = db.Column(db.String(255), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    start_location = db.Column(db.String(255), nullable=True)
    end_location = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class RouteStop(db.Model):
    __tablename__ = 'route_stops'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    route_id = db.Column(db.String(255), db.ForeignKey('routes.id', ondelete='CASCADE'), nullable=False)
    stop_id = db.Column(db.Integer, db.ForeignKey('stops.id', ondelete='CASCADE'), nullable=False)
    stop_order = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class StudentStopMapping(db.Model):
    __tablename__ = 'student_stop_mapping'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    stop_id = db.Column(db.Integer, db.ForeignKey('stops.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class Trip(db.Model):
    __tablename__ = 'trips'
    id = db.Column(db.String(255), primary_key=True)
    bus_id = db.Column(db.String(50), db.ForeignKey('buses.id', ondelete='CASCADE'), nullable=False)
    route_id = db.Column(db.String(255), nullable=True)
    driver_id = db.Column(db.String(255), nullable=True)
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), default='Running')
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class GpsHistory(db.Model):
    __tablename__ = 'gps_history'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    bus_id = db.Column(db.String(50), db.ForeignKey('buses.id', ondelete='CASCADE'), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    speed = db.Column(db.Integer, default=0)
    heading = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())
    trip_id = db.Column(db.String(255), db.ForeignKey('trips.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    __table_args__ = (
        db.Index('idx_gps_history_bus_time', 'bus_id', 'timestamp'),
    )

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('parents.id', ondelete='CASCADE'), nullable=False)
    student_id = db.Column(db.String(50), db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    bus_id = db.Column(db.String(50), db.ForeignKey('buses.id', ondelete='CASCADE'), nullable=False)
    stop_id = db.Column(db.Integer, db.ForeignKey('stops.id', ondelete='CASCADE'), nullable=False)
    trip_id = db.Column(db.String(255), db.ForeignKey('trips.id', ondelete='CASCADE'), nullable=True)
    distance = db.Column(db.Float, nullable=False)
    eta = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(255), default='Sent')
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    __table_args__ = (
        db.Index('idx_notifications_parent_trip', 'parent_id', 'trip_id'),
    )

class TripHistory(db.Model):
    __tablename__ = 'trip_history'
    id = db.Column(db.String(255), primary_key=True)
    bus_id = db.Column(db.String(50), nullable=False)
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class DriverAssignment(db.Model):
    __tablename__ = 'driver_assignments'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_username = db.Column(db.String(255), nullable=False)
    bus_id = db.Column(db.String(50), nullable=False)
    assigned_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class BusAssignment(db.Model):
    __tablename__ = 'bus_assignments'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    bus_id = db.Column(db.String(50), nullable=False)
    route_id = db.Column(db.String(255), nullable=False)
    assigned_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
"""
