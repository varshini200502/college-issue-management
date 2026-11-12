import os
import sys
import unittest
from datetime import datetime, timezone
from fastapi import HTTPException

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)
os.environ["DATABASE_URL"] = "sqlite:///./test_college.db"

from app.core.database import SessionLocal, Base, engine
from app.core.security import verify_password, get_password_hash
from app.core.dependencies import block_principal_mutation
from app.models.models import (
    User, Role, Department, Category, Ticket,
    TicketJustification, TicketStatusEnum, PriorityEnum
)
from app.schemas.schemas import (
    UserManagementCreate, PasswordResetRequest, ChangePasswordRequest, TicketCreate
)
from app.api.users import create_user, activate_user, deactivate_user, reset_user_password, list_users
from app.api.auth import change_password
from app.services.ticket_service import create_ticket

class TestUserManagementAndDemoIsolation(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_all_12_demo_personas_seeded(self):
        """All 12 demo personas exist and are marked is_demo=True."""
        expected_emails = [
            "student.alex@college.edu", "faculty.sarah@college.edu", "staff.david@college.edu",
            "it.admin@college.edu", "finance.admin@college.edu", "hr.admin@college.edu",
            "infra.admin@college.edu", "academics.admin@college.edu", "library.admin@college.edu",
            "hostel.admin@college.edu", "transport.admin@college.edu", "principal@college.edu"
        ]
        for email in expected_emails:
            u = self.db.query(User).filter(User.email == email).first()
            self.assertIsNotNone(u, f"Demo user {email} missing")
            self.assertTrue(u.is_demo, f"Demo user {email} must have is_demo=True")
            self.assertTrue(u.is_active, f"Demo user {email} must be active")
        print("[PASS] 01: All 12 demo personas verified with is_demo=True.")

    def test_02_principal_creates_user(self):
        """Principal can provision a new reporter or department admin."""
        principal = self.db.query(User).filter(User.email == "principal@college.edu").first()
        dept = self.db.query(Department).filter(Department.code == "IT").first()

        # Create new student
        new_student_data = UserManagementCreate(
            email=f"new.student.{datetime.now().timestamp()}@college.edu",
            full_name="New Student",
            password="StrongPassword@2026",
            role_name="reporter",
            reporter_type="student",
            is_demo=False
        )
        created = create_user(user_in=new_student_data, current_user=principal, db=self.db)
        self.assertEqual(created.full_name, "New Student")
        self.assertFalse(created.is_demo)

        # Create new dept admin
        new_admin_data = UserManagementCreate(
            email=f"new.itadmin.{datetime.now().timestamp()}@college.edu",
            full_name="New IT Officer",
            password="StrongAdminPassword@2026",
            role_name="department_admin",
            department_id=dept.id,
            is_demo=False
        )
        created_admin = create_user(user_in=new_admin_data, current_user=principal, db=self.db)
        self.assertEqual(created_admin.department_id, dept.id)
        print("[PASS] 02: Principal successfully provisions reporter and dept admin accounts.")

    def test_03_principal_user_activation_deactivation(self):
        """Principal can activate and deactivate user accounts."""
        principal = self.db.query(User).filter(User.email == "principal@college.edu").first()
        student = self.db.query(User).filter(User.email == "student.alex@college.edu").first()

        # Deactivate
        deactivated = deactivate_user(user_id=student.id, current_user=principal, db=self.db)
        self.assertFalse(deactivated.is_active)

        # Reactivate
        activated = activate_user(user_id=student.id, current_user=principal, db=self.db)
        self.assertTrue(activated.is_active)

        # Principal cannot deactivate self
        with self.assertRaises(HTTPException) as ctx:
            deactivate_user(user_id=principal.id, current_user=principal, db=self.db)
        self.assertEqual(ctx.exception.status_code, 400)
        print("[PASS] 03: User activation, deactivation, and self-deactivation protection verified.")

    def test_04_principal_resets_user_password(self):
        """Principal can reset any user's password without knowing the current password."""
        principal = self.db.query(User).filter(User.email == "principal@college.edu").first()
        student = self.db.query(User).filter(User.email == "staff.david@college.edu").first()

        reset_req = PasswordResetRequest(new_password="NewStaffPassword@2026")
        res = reset_user_password(user_id=student.id, req=reset_req, current_user=principal, db=self.db)
        self.assertIn("reset successfully", res["message"])

        # Verify new password works
        self.db.refresh(student)
        self.assertTrue(verify_password("NewStaffPassword@2026", student.hashed_password))
        print("[PASS] 04: Principal password reset verified.")

    def test_05_user_self_change_password(self):
        """Any authenticated user can change their own password by providing current password."""
        alex = self.db.query(User).filter(User.email == "student.alex@college.edu").first()

        # Wrong current password fails
        bad_req = ChangePasswordRequest(current_password="WrongOldPassword", new_password="NewAlexPassword@2026")
        with self.assertRaises(HTTPException) as ctx:
            change_password(req=bad_req, current_user=alex, db=self.db)
        self.assertEqual(ctx.exception.status_code, 400)

        # Correct current password succeeds
        current_pwd = "Demo_Student@2026"
        good_req = ChangePasswordRequest(current_password=current_pwd, new_password="NewAlexPassword@2026")
        res = change_password(req=good_req, current_user=alex, db=self.db)
        self.assertEqual(res["message"], "Password changed successfully.")
        self.assertTrue(verify_password("NewAlexPassword@2026", alex.hashed_password))

        # Revert back to Demo_Student@2026 for subsequent tests
        alex.hashed_password = get_password_hash("Demo_Student@2026")
        self.db.commit()
        print("[PASS] 05: Self-service password change endpoint validated.")

    def test_06_demo_ticket_isolation(self):
        """Tickets created by demo users automatically inherit is_demo=True."""
        demo_student = self.db.query(User).filter(User.email == "student.alex@college.edu").first()
        wifi_cat = self.db.query(Category).filter(Category.name == "Wi-Fi / Internet").first()

        ticket_in = TicketCreate(
            title="Demo Isolation Test Issue",
            description="Testing that ticket.is_demo flag is automatically inherited from reporter.",
            category_id=wifi_cat.id,
            confirm_duplicate=True
        )
        ticket = create_ticket(db=self.db, reporter=demo_student, ticket_in=ticket_in)
        self.assertTrue(ticket.is_demo, "Ticket created by demo student must have is_demo=True")
        print("[PASS] 06: Demo data isolation verified on ticket creation.")

if __name__ == "__main__":
    unittest.main()
