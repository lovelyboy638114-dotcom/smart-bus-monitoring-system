from students.models import Parent
from models import Student

class ParentLinkService:
    @staticmethod
    def find_existing_parent(phone, email, session):
        """
        Looks up a parent record in the database using phone or email.
        """
        if not phone and not email:
            return None
            
        query = session.query(Parent)
        filters = []
        if phone:
            filters.append(Parent.phone == phone)
        if email:
            filters.append(Parent.email == email)
            
        if len(filters) == 2:
            return query.filter(filters[0] | filters[1]).first()
        elif len(filters) == 1:
            return query.filter(filters[0]).first()
        return None

    @staticmethod
    def create_parent(father_name, mother_name, phone, email, address, username, password_hash, session):
        """
        Creates and stores a new parent profile in the database.
        """
        parent = Parent(
            father_name=father_name or "Father",
            mother_name=mother_name or "Mother",
            phone=phone or "+1-555-0000",
            email=email or "parent@school.edu",
            address=address or "Not Specified",
            username=username,
            password_hash=password_hash
        )
        session.add(parent)
        session.flush()
        return parent

    @staticmethod
    def link_student_to_parent(student, parent, session):
        """
        Links a student record to a parent record using foreign keys.
        """
        student.parent_id = parent.id
        student.parentName = parent.father_name or parent.mother_name or "Parent"
        student.parentPhone = parent.phone
        session.flush()

    @staticmethod
    def get_children(parent_id, session):
        """
        Retrieves all students linked to a specific parent ID.
        """
        return session.query(Student).filter(
            Student.parent_id == parent_id,
            Student.student_status == 'ACTIVE'
        ).all()

    @staticmethod
    def get_parent(parent_id, session):
        """
        Retrieves a parent record by its ID.
        """
        return session.query(Parent).filter(Parent.id == parent_id).first()
