import os
import sys
from pathlib import Path
from datetime import datetime

# Dynamic path resolution
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app import app
from models import db, Student
from students.services.idcard_service import IDCardService

def generate_missing():
    print("=== GENERATING MISSING ID CARDS FOR EXISTING STUDENTS ===")
    
    with app.app_context():
        students = db.session.query(Student).all()
        for s in students:
            print(f"Generating ID Card for: {s.name} (Roll: {s.rollNo})")
            
            # Check for required properties to prevent None errors in PIL
            student_data = {
                "id": s.id,
                "student_id": s.id,
                "name": s.name or "Student",
                "rollNo": s.rollNo or "R000",
                "class_name": s.class_name or "Grade 10",
                "section": s.section or "A",
                "gender": s.gender or "Male",
                "dob": s.dob or "2010-01-01",
                "bloodGroup": s.bloodGroup or "O+",
                "parentName": s.parentName or "Parent",
                "parentPhone": s.parentPhone or "+1-555-0000",
                "photo": s.photo,
                "admission_no": s.rollNo or "R000"
            }
            
            try:
                # Force create QR code path
                qr_file_path = s.qr_code_path or f"/uploads/qr_codes/{s.id}.png"
                paths = IDCardService.generate_id_card(student_data, qr_path=qr_file_path)
                
                s.qr_code_path = qr_file_path
                s.id_card_front_path = paths["front_path"]
                s.id_card_back_path = paths["back_path"]
                s.id_card_pdf_path = paths["pdf_path"]
                s.id_card_generated_at = datetime.utcnow()
                s.id_card_version = (s.id_card_version or 0) + 1
                s.id_card_status = 'ACTIVE'
                
                print(f"Successfully generated for {s.name}: {paths['pdf_path']}")
            except Exception as e:
                print(f"Failed to generate for {s.name}: {e}")
                
        db.session.commit()
        print("=== ID CARD GENERATION COMPLETED ===")

if __name__ == "__main__":
    generate_missing()
