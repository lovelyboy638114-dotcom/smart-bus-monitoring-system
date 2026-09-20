import os
import sys
from flask import Flask
from models import db, Student, Bus

# Load configurations
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
from dotenv import load_dotenv
env_path = os.path.join(BACKEND_DIR, '.env.development')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "3306")
db_name = os.getenv("DB_NAME", "safebus")
db_user = os.getenv("DB_USER", "root")
db_pass = os.getenv("DB_PASSWORD", "")

import urllib.parse
encoded_pass = urllib.parse.quote_plus(db_pass)
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{db_user}:{encoded_pass}@{db_host}:{db_port}/{db_name}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def seed():
    """
    SafeBus Student Seed Protection:
    - Never deletes or resets existing students table
    - Never inserts old mock data (Arjun, Kavin, etc.)
    - Verifies current MySQL database records
    """
    with app.app_context():
        existing_count = Student.query.count()
        print(f"[Seed Check] Current students table contains {existing_count} records.")
        if existing_count > 0:
            print("[Seed Notice] Students already exist in database. Preserving existing records without overwrite.")
            return

        print("[Seed Notice] Database has no students. Please populate via Admin portal or database import.")

if __name__ == "__main__":
    seed()