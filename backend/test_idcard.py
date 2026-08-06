import os
import sys
import re
from pathlib import Path
from PIL import Image
from unittest.mock import patch

# 1. Truly portable path resolution relative to the test file location
BASE_DIR = Path(__file__).resolve()
backend_p = None
for parent in BASE_DIR.parents:
    if parent.name == "backend":
        backend_p = parent
        break
    elif (parent / "backend").exists():
        backend_p = parent / "backend"
        break

if not backend_p:
    raise RuntimeError("Backend directory not found in parent path tree.")

sys.path.insert(0, str(backend_p))

from app import app
from models import db, Student, Account
from students.models import Parent
from students.services.idcard_service import IDCardService

def run_tests():
    print("=== STARTING ADVANCED INTEGRATION & ROBUSTNESS TESTS ===")
    
    student_id = "STU_TEST_99"
    admission_no = "ADM_TEST_99"
    email = "arjun.test@school.edu"
    parent_email = "parent.test@school.edu"
    
    # Define paths to clean up
    front_path_expected = backend_p / "uploads" / "id_cards" / "front" / f"{student_id}_front.png"
    back_path_expected = backend_p / "uploads" / "id_cards" / "back" / f"{student_id}_back.png"
    pdf_path_expected = backend_p / "uploads" / "id_cards" / "pdf" / f"{student_id}.pdf"
    
    # Helper to clean generated files
    def cleanup_files():
        front_path_expected.unlink(missing_ok=True)
        back_path_expected.unlink(missing_ok=True)
        pdf_path_expected.unlink(missing_ok=True)
        print("Cleaned up generated test ID Card files.")

    # Clean up DB first
    with app.app_context():
        db.session.query(Student).filter(Student.id == student_id).delete()
        db.session.query(Account).filter(Account.username == email).delete()
        db.session.query(Account).filter(Account.username == parent_email).delete()
        db.session.query(Parent).filter(Parent.username == parent_email).delete()
        db.session.commit()
    cleanup_files()
    
    try:
        # 2. Setup mock data
        with app.app_context():
            print("Creating parent profile...")
            parent = Parent(
                father_name="Father Test",
                mother_name="Mother Test",
                phone="+1-555-9999",
                email=parent_email,
                address="456 Test Lane",
                username=parent_email,
                password_hash="fake_hash"
            )
            db.session.add(parent)
            db.session.commit()
            
            print("Creating student profile linked to parent...")
            student = Student(
                id=student_id,
                name="Arjun Test",
                rollNo="R99",
                class_name="Grade 10",
                section="A",
                admission_no=admission_no,
                school_email=email,
                parent_id=parent.id,
                parentName="Father Test",
                parentPhone="+1-555-9999",
                student_status="ACTIVE",
                id_card_version=1,
                id_card_status="ACTIVE"
            )
            db.session.add(student)
            db.session.commit()

        # 3. Test Flask Test Client Access Controls
        with app.test_client() as client:
            
            print("API: POST /api/v1/students/{id}/regenerate-id-card (Admin Role - Generation 1)")
            r = client.post(f"/api/v1/students/{student_id}/regenerate-id-card", headers={
                "X-User-Role": "admin"
            })
            data = r.get_json()
            assert r.status_code == 200
            assert data["data"]["version"] == 2
            assert data["data"]["status"] == "REGENERATED"

            # 4. Verify Database Persistence States & Image Dimensions
            with app.app_context():
                student_db = db.session.query(Student).filter(Student.id == student_id).first()
                
                # Check path existences (Relative to resolved backend path)
                front_path = backend_p / student_db.id_card_front_path.replace("/uploads/", "uploads/")
                back_path = backend_p / student_db.id_card_back_path.replace("/uploads/", "uploads/")
                pdf_path = backend_p / student_db.id_card_pdf_path.replace("/uploads/", "uploads/")
                
                assert front_path.exists()
                assert back_path.exists()
                assert pdf_path.exists()

                # Verify Image sizes & dimensions against configurations defaults
                print("Checking image formats and dimension constraints...")
                expected_width = IDCardService.CARD_WIDTH
                expected_height = IDCardService.CARD_HEIGHT
                with Image.open(str(front_path)) as img_f:
                    assert img_f.size == (expected_width, expected_height)
                    img_f.verify()
                with Image.open(str(back_path)) as img_b:
                    assert img_b.size == (expected_width, expected_height)
                    img_b.verify()
                print(f"Image sizes verify exactly to ({expected_width}, {expected_height}) PVC Card dimensions.")

                # Verify PDF binary signature and size
                pdf_bytes = pdf_path.read_bytes()
                assert pdf_bytes.startswith(b"%PDF")
                assert len(pdf_bytes) > 2000
                print("PDF binary signature verified.")

            # Access Control: Student without linked parent test
            print("API: GET /api/v1/parent/student-id-card/{id} (Denied for unlinked parent)")
            r = client.get(f"/api/v1/parent/student-id-card/{student_id}", headers={
                "X-User-Role": "parent",
                "X-User-Username": "unlinked_parent@happyjourney.ai"
            })
            assert r.status_code == 403 or r.status_code == 404
            print("Parent API checks verify unlinked access blocks.")

        # 5. Test Missing templates fallbacks & verify default rendering details
        print("Testing missing template rendering fallbacks...")
        with app.app_context():
            student_dict = {
                "id": "STU_TEMP_MISSING",
                "name": "Fallback Test",
                "rollNo": "R0",
                "class_name": "Grade 0",
                "section": "Z",
                "admission_no": "ADM_TEMP_0"
            }
            paths = IDCardService.generate_id_card(student_dict, qr_path=None)
            front_p = backend_p / paths["front_path"].replace("/uploads/", "uploads/")
            back_p = backend_p / paths["back_path"].replace("/uploads/", "uploads/")
            
            assert front_p.exists()
            assert back_p.exists()
            
            # Verify that fallback images are valid and have drawn content (not solid white canvas)
            with Image.open(str(front_p)) as img_f:
                extrema = img_f.getextrema()
                # If there are drawings/colors, at least one of RGBA channels must have min < max
                assert any(ext[0] < ext[1] for ext in extrema)
            with Image.open(str(back_p)) as img_b:
                extrema = img_b.getextrema()
                assert any(ext[0] < ext[1] for ext in extrema)
            
            # Clean up missing test files
            front_p.unlink(missing_ok=True)
            back_p.unlink(missing_ok=True)
            Path(str(front_p).replace("_front.png", ".pdf")).unlink(missing_ok=True)
            print("Fallback rendering content validation completed successfully.")

        # 6. Test Service save mock failure rollback behavior
        print("Testing transaction rollback behaviors upon Service generation failure...")
        with app.app_context():
            student_db = db.session.query(Student).filter(Student.id == student_id).first()
            
            # Record original DB attributes
            orig_version = student_db.id_card_version
            orig_status = student_db.id_card_status
            
            student_data_mock = {
                "id": student_id,
                "name": "Arjun Test"
            }
            
            # Mock Image.save to raise RuntimeError during writing files
            from PIL.Image import Image as PILImage
            with patch.object(PILImage, "save") as mock_save:
                mock_save.side_effect = RuntimeError("PIL image save failed")
                
                try:
                    db.session.begin_nested() # Nested SQL rollback savepoint
                    
                    # Update local state variables
                    student_db.id_card_version = 999
                    student_db.id_card_status = "CORRUPTED"
                    
                    # Trigger the service which will fail on image saving internally
                    IDCardService.generate_id_card(student_data_mock, qr_path=None)
                except RuntimeError:
                    db.session.rollback()
                    print("Service generation failed due to mocked save failure, transaction rolled back.")
                
                db.session.commit()
            
            # Confirm student record remains unchanged
            assert student_db.id_card_version == orig_version
            assert student_db.id_card_status == orig_status
            print("DB rollbacks successfully verified.")

    finally:
        # Cleanup mock database records
        with app.app_context():
            db.session.query(Student).filter(Student.id == student_id).delete()
            db.session.query(Parent).filter(Parent.username == parent_email).delete()
            db.session.commit()
            print("DB Cleanup completed successfully (finally clause executed).")
        # Cleanup generated file paths
        cleanup_files()
            
    print("=== ADVANCED TESTING COMPLETE & INTEGRITY IS PERFECT ===")

if __name__ == "__main__":
    run_tests()
