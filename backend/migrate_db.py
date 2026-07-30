import os
import shutil
import sqlite3
import logging
from dotenv import load_dotenv
from flask import Flask
from models import db, Account, Bus, Student, Alert, TelemetryLog, DriverMessage, DriverComplaint
from werkzeug.security import generate_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("safebus-migration")

# Locate directories
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_PATH = os.path.join(BACKEND_DIR, 'safebus.db')
SQLITE_BAK_PATH = os.path.join(BACKEND_DIR, 'safebus.db.bak')

def backup_sqlite():
    if os.path.exists(SQLITE_PATH):
        logger.info(f"Creating backup copy of SQLite database to {SQLITE_BAK_PATH}...")
        shutil.copy2(SQLITE_PATH, SQLITE_BAK_PATH)
        logger.info("Backup successfully completed.")
    else:
        logger.warning(f"No SQLite database found at {SQLITE_PATH} to backup.")

def main():
    # 1. Back up SQLite database
    backup_sqlite()

    # Load environmental parameters
    env_path = os.path.join(BACKEND_DIR, '.env.development')
    if os.path.exists(env_path):
        logger.info(f"Loading environment configurations from {env_path}")
        load_dotenv(env_path)
    else:
        logger.info("Loading default environment configurations")
        load_dotenv()

    # Get MySQL connection parameters
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "3306")
    db_name = os.getenv("DB_NAME", "safebus")
    db_user = os.getenv("DB_USER", "root")
    db_pass = os.getenv("DB_PASSWORD", "")

    # Establish Flask application dummy context
    import urllib.parse
    encoded_pass = urllib.parse.quote_plus(db_pass)
    app = Flask(__name__)
    mysql_uri = f"mysql+pymysql://{db_user}:{encoded_pass}@{db_host}:{db_port}/{db_name}"
    app.config['SQLALCHEMY_DATABASE_URI'] = mysql_uri
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Connection Pool Settings
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 10,
        'max_overflow': 20,
        'pool_recycle': 3600,
        'pool_timeout': 30
    }
    
    db.init_app(app)

    # 2. Schema Creation Phase
    with app.app_context():
        try:
            logger.info("Dropping existing tables in MySQL if any to ensure clean schema rebuild...")
            db.drop_all()
            logger.info("Rebuilding tables in MySQL...")
            db.create_all()
            logger.info("MySQL schema structure generated successfully.")
        except Exception as err:
            logger.error(f"Failed to generate schemas in MySQL: {err}")
            return

    # 3. Read & Copy SQLite Data to MySQL
    if not os.path.exists(SQLITE_BAK_PATH):
        logger.error("No SQLite backup database file available. Aborting migration.")
        return

    sqlite_conn = sqlite3.connect(SQLITE_BAK_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    tables_map = [
        {"name": "accounts", "model": Account, "class": "Account"},
        {"name": "buses", "model": Bus, "class": "Bus"},
        {"name": "students", "model": Student, "class": "Student"},
        {"name": "alerts", "model": Alert, "class": "Alert"},
        {"name": "telemetry_logs", "model": TelemetryLog, "class": "TelemetryLog"},
        {"name": "driver_messages", "model": DriverMessage, "class": "DriverMessage"},
        {"name": "driver_complaints", "model": DriverComplaint, "class": "DriverComplaint"}
    ]

    report = {}

    with app.app_context():
        try:
            for t in tables_map:
                table_name = t["name"]
                model_cls = t["model"]
                
                # Fetch SQLite row counts
                sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                sqlite_count = sqlite_cursor.fetchone()[0]
                
                sqlite_cursor.execute(f"SELECT * FROM {table_name}")
                rows = sqlite_cursor.fetchall()
                
                copied_count = 0
                failed_count = 0
                skipped_count = 0
                
                for row in rows:
                    data = dict(row)
                    
                    # Custom treatments: Password hashing for Account credentials
                    if table_name == "accounts":
                        # Hash the plaintext password
                        pwd = data.get("password", "")
                        # Check if password is not already hashed (hashed passwords start with scrypt: or pbkdf2:)
                        if not (pwd.startswith("scrypt:") or pwd.startswith("pbkdf2:")):
                            data["password"] = generate_password_hash(pwd)
                    
                    # Convert class -> class_name for Student table mapping
                    if table_name == "students":
                        if "class" in data:
                            data["class_name"] = data.pop("class")
                    
                    try:
                        record = model_cls(**data)
                        db.session.add(record)
                        copied_count += 1
                    except Exception as ins_err:
                        logger.warning(f"Record copy failed for {table_name} row: {ins_err}")
                        failed_count += 1
                
                # Flush the session within transaction boundary
                db.session.commit()
                
                # Verify row counts in MySQL
                mysql_count = db.session.query(model_cls).count()
                
                report[table_name] = {
                    "sqlite_count": sqlite_count,
                    "mysql_count": mysql_count,
                    "copied": copied_count,
                    "skipped": skipped_count,
                    "failed": failed_count,
                    "status": "OK" if sqlite_count == mysql_count else "MISMATCH"
                }
            
            logger.info("Data copying phase successfully completed.")
            
        except Exception as ex:
            db.session.rollback()
            logger.error(f"Migration transaction failed: {ex}. Rolling back changes.")
            # Drop MySQL tables to prevent half-configured state
            db.drop_all()
            return
        finally:
            sqlite_conn.close()

    # 4. Generate final Migration Integrity verification report
    print("\n" + "="*50)
    print("           DATABASE MIGRATION INTEGRITY REPORT")
    print("="*50)
    all_ok = True
    for t_name, metrics in report.items():
        print(f"\nTable: {t_name}")
        print(f"  SQLite Record Count : {metrics['sqlite_count']}")
        print(f"  MySQL Record Count  : {metrics['mysql_count']}")
        print(f"  Copied Records      : {metrics['copied']}")
        print(f"  Failed Records      : {metrics['failed']}")
        print(f"  Status              : {metrics['status']}")
        if metrics['status'] != "OK":
            all_ok = False
            
    print("\n" + "="*50)
    if all_ok:
        print("     MIGRATION COMPLETED SUCCESSFULLY (STATUS: OK)")
    else:
        print("     MIGRATION FAILED WITH COUNT MISMATCHES")
    print("="*50 + "\n")

if __name__ == "__main__":
    main()
