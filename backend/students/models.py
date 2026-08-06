from models import db

class Parent(db.Model):
    __tablename__ = 'parents'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    father_name = db.Column(db.String(150), nullable=False)
    mother_name = db.Column(db.String(150), nullable=False)
    guardian_name = db.Column(db.String(150), nullable=True)
    phone = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class StudentSequence(db.Model):
    __tablename__ = 'student_sequences'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

class AttendanceLog(db.Model):
    __tablename__ = 'attendance_logs'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    bus_id = db.Column(db.String(50), db.ForeignKey('buses.id', ondelete='CASCADE'), nullable=False)
    driver_name = db.Column(db.String(150), nullable=False)
    scan_time = db.Column(db.String(50), nullable=False)
    scan_date = db.Column(db.String(50), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    attendance_type = db.Column(db.String(50), nullable=False) # 'Boarding', 'Dropped'
    trip_id = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default='Success')
    
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    __table_args__ = (
        db.Index('idx_attendance_logs_lookup', 'student_id', 'scan_date', 'trip_id', 'bus_id', 'status'),
    )

class StudentEvent(db.Model):
    __tablename__ = 'student_events'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    event_name = db.Column(db.String(150), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

class ParentNotificationLog(db.Model):
    __tablename__ = 'parent_notification_logs'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    notification_type = db.Column(db.String(100), nullable=False)
    delivery_method = db.Column(db.String(50), nullable=False) # 'SMS', 'Email', 'Push'
    status = db.Column(db.String(50), nullable=False) # 'SENT', 'FAILED'
    sent_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    error_message = db.Column(db.String(255), nullable=True)

class CredentialAudit(db.Model):
    __tablename__ = 'credential_audits'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False)
    generated_by = db.Column(db.String(100), nullable=False)
    generated_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    credential_type = db.Column(db.String(50), nullable=False) # 'CREATION', 'RESET'
    first_login_completed = db.Column(db.Boolean, default=False, server_default='0')
    download_count = db.Column(db.Integer, default=0, server_default='0')
    printed_count = db.Column(db.Integer, default=0, server_default='0')
    status = db.Column(db.String(50), default='ACTIVE', server_default='ACTIVE')
    
    # Extended audit columns
    reset_time = db.Column(db.DateTime, nullable=True)
    password_changed = db.Column(db.DateTime, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    browser = db.Column(db.String(150), nullable=True)
    device = db.Column(db.String(150), nullable=True)

