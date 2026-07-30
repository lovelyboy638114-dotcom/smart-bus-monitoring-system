import sqlite3
import os

DB_FILE = os.path.join(os.path.dirname(__file__), 'safebus.db')

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Accounts Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            fullName TEXT NOT NULL,
            licenseNo TEXT,
            experienceYears INTEGER,
            busRoute TEXT,
            phone TEXT
        )
    ''')
    
    # Buses Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS buses (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            route TEXT NOT NULL,
            driver TEXT NOT NULL,
            driverLicense TEXT,
            driverExperience INTEGER,
            speed INTEGER DEFAULT 0,
            maxSpeed INTEGER DEFAULT 60,
            status TEXT DEFAULT 'Idle',
            eta TEXT,
            nextStop TEXT,
            studentsOnboard INTEGER DEFAULT 0,
            latitude REAL,
            longitude REAL,
            deviation INTEGER DEFAULT 0
        )
    ''')
    
    # Students Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            rollNo TEXT NOT NULL,
            class TEXT NOT NULL,
            busId TEXT,
            boarded INTEGER DEFAULT 0,
            boardedTime TEXT,
            reachedSchool INTEGER DEFAULT 0,
            boardedReturn INTEGER DEFAULT 0,
            reachedHome INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Not Started',
            parentName TEXT,
            parentPhone TEXT,
            bloodGroup TEXT,
            address TEXT,
            medicalNotes TEXT
        )
    ''')
    
    # Alerts Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            severity TEXT NOT NULL,
            bus TEXT,
            driver TEXT,
            time TEXT,
            resolved INTEGER DEFAULT 0
        )
    ''')
    
    # Telemetry Logs Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS telemetry_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            busId TEXT,
            latitude REAL,
            longitude REAL,
            speed INTEGER,
            acceleration REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Parent-Driver Messages Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS driver_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            studentId TEXT,
            studentName TEXT,
            status TEXT,
            message TEXT,
            timestamp TEXT
        )
    ''')

    # Parent-Admin Complaints Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS driver_complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parentName TEXT,
            studentName TEXT,
            driverName TEXT,
            busId TEXT,
            complaintText TEXT,
            timestamp TEXT,
            status TEXT DEFAULT 'Pending'
        )
    ''')
    
    # Seed Initial Demo Accounts
    demo_accounts = [
        ('admin', 'admin@happyjourney.ai', 'admin123', 'System Administrator', None, None, None, None),
        ('driver', 'driver@happyjourney.ai', 'driver123', 'Ramesh Kumar', 'DL-TN38AB2024', 8, 'TN38AB1234', '+91 99999 88888'),
        ('parent', 'parent@happyjourney.ai', 'parent123', 'Rajesh Kumar', None, None, None, '+91 98450 12345'),
        ('student', 'student@happyjourney.ai', 'student123', 'Rahul Kumar', None, None, 'TN38AB1234', None)
    ]
    for acc in demo_accounts:
        try:
            cursor.execute('''
                INSERT INTO accounts (role, username, password, fullName, licenseNo, experienceYears, busRoute, phone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', acc)
        except sqlite3.IntegrityError:
            pass # Already exists
            
    # Seed Initial Buses
    initial_buses = [
        ("TN38AB1234", "Route A Bus", "Route A (Ukkadam)", "Ramesh Kumar", "DL-TN38AB2024", 8, 45, 60, "Idle", "08:10 AM", "Kurichi", 18, 10.9821, 76.8274, 0),
        ("TN38CD5678", "Route B Bus", "Route B (Gandhipuram)", "Suresh Pillai", "DL-TN38CD2022", 5, 38, 60, "Idle", "08:25 AM", "RS Puram", 24, 11.0168, 76.9688, 0),
        ("TN38EP9012", "Route C Bus", "Route C (Peelamedu)", "Kumar Swamy", "DL-TN38EP2018", 12, 52, 60, "Idle", "08:15 AM", "PSG Tech", 15, 11.0300, 77.0000, 0)
    ]
    for b in initial_buses:
        try:
            cursor.execute('''
                INSERT INTO buses (id, name, route, driver, driverLicense, driverExperience, speed, maxSpeed, status, eta, nextStop, studentsOnboard, latitude, longitude, deviation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', b)
        except sqlite3.IntegrityError:
            pass
            
    # Seed Initial Students
    initial_students = [
        ("12", "Rahul Kumar", "12", "8A", "TN38AB1234", 0, "", 0, 0, 0, "Not Started", "Rajesh Kumar", "+91 98450 12345", "O+ve", "12, Ukkadam Bypass Road, Coimbatore", "No drug allergies"),
        ("15", "Priya Sharma", "15", "8B", "TN38AB1234", 0, "", 0, 0, 0, "Not Started", "Amit Sharma", "+91 91234 56789", "A+ve", "4, RS Puram Layout, Coimbatore", "Asthmatic, carries inhaler")
    ]
    for s in initial_students:
        try:
            cursor.execute('''
                INSERT INTO students (id, name, rollNo, class, busId, boarded, boardedTime, reachedSchool, boardedReturn, reachedHome, status, parentName, parentPhone, bloodGroup, address, medicalNotes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', s)
        except sqlite3.IntegrityError:
            pass
            
    conn.commit()
    conn.close()
    print("Database initialized and seeded successfully.")

if __name__ == "__main__":
    init_db()
