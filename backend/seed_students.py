import os
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

# Original student data list from mockData.ts
raw_students = [
  # Bus 1 Students
  { "id": "ST001", "name": "Arjun", "assignedBus": "Bus 1", "pickupStop": "Gandhipuram Bus Stand", "parentContact": "+91 98450 12301", "status": "On Board", "rollNo": "R001", "class": "Class 5-A" },
  { "id": "ST002", "name": "Kavin", "assignedBus": "Bus 1", "pickupStop": "RS Puram", "parentContact": "+91 98450 12302", "status": "On Board", "rollNo": "R002", "class": "Class 5-B" },
  { "id": "ST003", "name": "Rahul", "assignedBus": "Bus 1", "pickupStop": "Saibaba Colony", "parentContact": "+91 98450 12303", "status": "On Board", "rollNo": "R003", "class": "Class 6-A" },
  { "id": "ST004", "name": "Harish", "assignedBus": "Bus 1", "pickupStop": "Vadavalli", "parentContact": "+91 98450 12304", "status": "On Board", "rollNo": "R004", "class": "Class 6-B" },
  { "id": "ST005", "name": "Sanjay", "assignedBus": "Bus 1", "pickupStop": "Thudiyalur", "parentContact": "+91 98450 12305", "status": "On Board", "rollNo": "R005", "class": "Class 7-A" },
  { "id": "ST006", "name": "Vignesh", "assignedBus": "Bus 1", "pickupStop": "Kavundampalayam", "parentContact": "+91 98450 12306", "status": "Waiting", "rollNo": "R006", "class": "Class 7-B" },
  { "id": "ST007", "name": "Praveen", "assignedBus": "Bus 1", "pickupStop": "GN Mills", "parentContact": "+91 98450 12307", "status": "Waiting", "rollNo": "R007", "class": "Class 8-A" },

  # Bus 2 Students
  { "id": "ST008", "name": "Dinesh", "assignedBus": "Bus 2", "pickupStop": "Hope College", "parentContact": "+91 98450 12308", "status": "On Board", "rollNo": "R008", "class": "Class 8-B" },
  { "id": "ST009", "name": "Naveen", "assignedBus": "Bus 2", "pickupStop": "Peelamedu", "parentContact": "+91 98450 12309", "status": "On Board", "rollNo": "R009", "class": "Class 9-A" },
  { "id": "ST010", "name": "Ajay", "assignedBus": "Bus 2", "pickupStop": "Singanallur", "parentContact": "+91 98450 12310", "status": "Not Boarded", "rollNo": "R010", "class": "Class 9-B" },
  { "id": "ST011", "name": "Bharath", "assignedBus": "Bus 2", "pickupStop": "Chinniyampalayam", "parentContact": "+91 98450 12311", "status": "On Board", "rollNo": "R011", "class": "Class 10-A" },
  { "id": "ST012", "name": "Manoj", "assignedBus": "Bus 2", "pickupStop": "Neelambur", "parentContact": "+91 98450 12312", "status": "Waiting", "rollNo": "R012", "class": "Class 10-B" },
  { "id": "ST013", "name": "Vishal", "assignedBus": "Bus 2", "pickupStop": "Kalapatti", "parentContact": "+91 98450 12313", "status": "Waiting", "rollNo": "R013", "class": "Class 11-A" },
  { "id": "ST014", "name": "Surya", "assignedBus": "Bus 2", "pickupStop": "Saravanampatti", "parentContact": "+91 98450 12314", "status": "Waiting", "rollNo": "R014", "class": "Class 11-B" },

  # Bus 3 Students
  { "id": "ST015", "name": "Karthik", "assignedBus": "Bus 3", "pickupStop": "Ukkadam Bus Stand", "parentContact": "+91 98450 12315", "status": "On Board", "rollNo": "R015", "class": "Class 12-A" },
  { "id": "ST016", "name": "Akash", "assignedBus": "Bus 3", "pickupStop": "Town Hall", "parentContact": "+91 98450 12316", "status": "On Board", "rollNo": "R016", "class": "Class 12-B" },
  { "id": "ST017", "name": "Gokul", "assignedBus": "Bus 3", "pickupStop": "Podanur", "parentContact": "+91 98450 12317", "status": "On Board", "rollNo": "R017", "class": "Class 5-A" },
  { "id": "ST018", "name": "Nithin", "assignedBus": "Bus 3", "pickupStop": "Sundarapuram", "parentContact": "+91 98450 12318", "status": "On Board", "rollNo": "R018", "class": "Class 5-B" },
  { "id": "ST019", "name": "Ramesh", "assignedBus": "Bus 3", "pickupStop": "Kuniyamuthur", "parentContact": "+91 98450 12319", "status": "Waiting", "rollNo": "R019", "class": "Class 6-A" },
  { "id": "ST020", "name": "Saran", "assignedBus": "Bus 3", "pickupStop": "Eachanari", "parentContact": "+91 98450 12320", "status": "Waiting", "rollNo": "R020", "class": "Class 6-B" },
  { "id": "ST021", "name": "Ashwin", "assignedBus": "Bus 3", "pickupStop": "Madukkarai", "parentContact": "+91 98450 12321", "status": "Waiting", "rollNo": "R021", "class": "Class 7-A" }
]

bus_mapping = {
    "Bus 1": "TN38AB1234",
    "Bus 2": "TN38CD5678",
    "Bus 3": "TN38EP9012"
}

def seed():
    with app.app_context():
        print("Clearing students table...")
        db.session.query(Student).delete()
        
        print("Seeding original 21 students...")
        for rs in raw_students:
            s = Student(
                id=rs["id"],
                name=rs["name"],
                rollNo=rs["rollNo"],
                class_name=rs["class"],
                busId=bus_mapping.get(rs["assignedBus"]),
                boarded=1 if rs["status"] == "On Board" else 0,
                boardedTime="08:30 AM" if rs["status"] == "On Board" else None,
                reachedSchool=1 if rs["status"] == "Dropped" else 0,
                boardedReturn=0,
                reachedHome=0,
                status=rs["status"],
                parentName=f"Parent of {rs['name']}",
                parentPhone=rs["parentContact"],
                bloodGroup="O+",
                address=rs["pickupStop"],
                medicalNotes="None"
            )
            db.session.add(s)
        
        db.session.commit()
        print("Successfully seeded all 21 students in MySQL database!")

if __name__ == "__main__":
    seed()
