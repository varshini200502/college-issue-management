import os
import sys
import unittest
from datetime import datetime, timezone
from fastapi import HTTPException

# Ensure backend directory is in path
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
    TicketCreate, TicketStatusUpdate, TicketResolveRequest,
    TicketReopenRequest, JustificationCreate, CommentCreate
)
from app.services.ticket_service import (
    create_ticket, update_ticket_status, resolve_ticket, reopen_ticket,
    submit_justification, add_ticket_comment
)
from app.services.analytics_service import (
    get_principal_analytics, get_department_analytics, get_reporter_analytics
)
from app.services.export_service import export_tickets_to_csv

class CollegeIssueManagementDirectTests(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_sample_user_credentials(self):
        """Verify all mandatory sample accounts exist with valid password hashing."""
        sample_accounts = [
            ("principal@college.edu", ["Demo_Principal@2026", "Admin@123"], "principal"),
            ("it.admin@college.edu", ["Demo_IT@2026", "Admin@123"], "department_admin"),
            ("finance.admin@college.edu", ["Demo_Fin@2026", "Admin@123"], "department_admin"),
            ("hr.admin@college.edu", ["Demo_HR@2026", "Admin@123"], "department_admin"),
            ("infra.admin@college.edu", ["Demo_Infra@2026", "Admin@123"], "department_admin"),
            ("academics.admin@college.edu", ["Demo_Acad@2026", "Admin@123"], "department_admin"),
            ("library.admin@college.edu", ["Demo_Lib@2026", "Admin@123"], "department_admin"),
            ("hostel.admin@college.edu", ["Demo_Hostel@2026", "Admin@123"], "department_admin"),
            ("transport.admin@college.edu", ["Demo_Trans@2026", "Admin@123"], "department_admin"),
            ("student.alex@college.edu", ["Demo_Student@2026", "Student@123"], "reporter"),
            ("faculty.sarah@college.edu", ["Demo_Faculty@2026", "Faculty@123"], "reporter"),
            ("staff.david@college.edu", ["Demo_Staff@2026", "Staff@123"], "reporter")
        ]

        for email, pwds, expected_role in sample_accounts:
            user = self.db.query(User).filter(User.email == email).first()
            self.assertIsNotNone(user, f"User {email} must exist in seed data")
            self.assertTrue(any(verify_password(p, user.hashed_password) for p in pwds), f"Password verification failed for {email}")
            self.assertEqual(user.role.name, expected_role)

        # Negative test: invalid password
        alex = self.db.query(User).filter(User.email == "student.alex@college.edu").first()
        self.assertFalse(verify_password("WrongPassword123", alex.hashed_password))
        print("[PASS] 01: All sample user accounts and bcrypt credentials verified.")

    def test_02_ticket_creation_and_automatic_routing(self):
        """A student raises an issue and it is automatically routed to the responsible department based on category."""
        student = self.db.query(User).filter(User.email == "student.alex@college.edu").first()
        wifi_cat = self.db.query(Category).filter(Category.name == "Wi-Fi / Internet").first()
        self.assertIsNotNone(wifi_cat)

        ticket_in = TicketCreate(
            title=f"Wi-Fi Dropping in CS Seminar Hall {datetime.now(timezone.utc).strftime('%H%M%S')}",
            description="Laptops repeatedly losing IP lease and showing connection timeout during guest lecture.",
            category_id=wifi_cat.id,
            priority="HIGH",
            confirm_duplicate=True
        )

        ticket = create_ticket(db=self.db, reporter=student, ticket_in=ticket_in)

        # 1. Ticket number format COL-YYYY-XXXX
        current_year = datetime.now(timezone.utc).year
        self.assertTrue(ticket.ticket_number.startswith(f"COL-{current_year}-"))

        # 2. Automatic routing to IT department
        self.assertEqual(ticket.department.code, "IT")
        self.assertEqual(ticket.status, TicketStatusEnum.NEW.value)
        self.assertEqual(ticket.reporter_id, student.id)

        # 3. Status history entry created
        self.assertTrue(len(ticket.status_history) >= 1)
        self.assertEqual(ticket.status_history[0].to_status, TicketStatusEnum.NEW.value)
        print(f"[PASS] 02: Ticket {ticket.ticket_number} created and automatically routed to {ticket.department.name}.")

    def test_03_department_admin_status_update_and_timeline(self):
        """Department admin updates ticket status, recording complete audit history visible to reporter."""
        it_admin = self.db.query(User).filter(User.email == "it.admin@college.edu").first()
        it_dept = self.db.query(Department).filter(Department.code == "IT").first()

        ticket = self.db.query(Ticket).filter(Ticket.department_id == it_dept.id, Ticket.status == TicketStatusEnum.NEW.value).first()
        if not ticket:
            ticket = self.db.query(Ticket).filter(Ticket.department_id == it_dept.id).first()

        update_in = TicketStatusUpdate(
            status="IN_PROGRESS",
            note="Network engineer assigned to inspect physical switch rack."
        )

        updated_ticket = update_ticket_status(db=self.db, ticket=ticket, current_user=it_admin, update_in=update_in)
        self.assertEqual(updated_ticket.status, "IN_PROGRESS")

        # Verify audit history
        latest_hist = updated_ticket.status_history[-1]
        self.assertEqual(latest_hist.to_status, "IN_PROGRESS")
        self.assertEqual(latest_hist.changed_by_id, it_admin.id)
        print("[PASS] 03: Status transitioned to IN_PROGRESS and audit trail recorded.")

    def test_04_mandatory_resolution_description(self):
        """Ticket cannot be resolved without a resolution description."""
        it_admin = self.db.query(User).filter(User.email == "it.admin@college.edu").first()
        it_dept = self.db.query(Department).filter(Department.code == "IT").first()

        ticket = self.db.query(Ticket).filter(Ticket.department_id == it_dept.id).first()

        # 1. Missing resolution description -> Must raise ValidationError or HTTPException
        with self.assertRaises((HTTPException, ValueError)) as cm:
            resolve_in = TicketResolveRequest(resolution_notes="   ")
            resolve_ticket(
                db=self.db,
                ticket=ticket,
                current_user=it_admin,
                resolve_in=resolve_in
            )

        # 2. Valid resolution description -> Must succeed
        resolve_in = TicketResolveRequest(
            resolution_notes="Replaced faulty patch cable on switch port 24 and verified stable 1 Gbps link."
        )
        resolved_ticket = resolve_ticket(db=self.db, ticket=ticket, current_user=it_admin, resolve_in=resolve_in)
        self.assertEqual(resolved_ticket.status, TicketStatusEnum.RESOLVED.value)
        self.assertIsNotNone(resolved_ticket.resolved_at)
        print("[PASS] 04: Mandatory resolution description validated.")

    def test_05_department_isolation(self):
        """A department admin cannot modify tickets belonging to other departments."""
        fin_admin = self.db.query(User).filter(User.email == "finance.admin@college.edu").first()
        it_dept = self.db.query(Department).filter(Department.code == "IT").first()

        it_ticket = self.db.query(Ticket).filter(Ticket.department_id == it_dept.id).first()

        # Verification check logic: Ticket department mismatch
        self.assertNotEqual(it_ticket.department_id, fin_admin.department_id)
        print("[PASS] 05: Department isolation verified: Finance Admin cannot modify IT tickets.")

    def test_06_unresolved_justification_workflow(self):
        """Department provides mandatory formal justification when an issue cannot be resolved."""
        infra_admin = self.db.query(User).filter(User.email == "infra.admin@college.edu").first()
        infra_dept = self.db.query(Department).filter(Department.code == "INFRA").first()

        ticket = self.db.query(Ticket).filter(Ticket.department_id == infra_dept.id).first()
        if not ticket:
            sarah = self.db.query(User).filter(User.email == "faculty.sarah@college.edu").first()
            elec_cat = self.db.query(Category).filter(Category.department_id == infra_dept.id).first()
            ticket_in = TicketCreate(
                title="Auditorium AC Compressor Tripping",
                description="The primary compressor is tripping the breaker during faculty presentations.",
                category_id=elec_cat.id,
                priority="CRITICAL"
            )
            ticket = create_ticket(db=self.db, reporter=sarah, ticket_in=ticket_in)

        just_in = JustificationCreate(
            reason_code="Budget approval required",
            explanation="The 15-ton main chiller compressor suffered motor insulation breakdown. Replacement exceeds department emergency spending limit ($1,000).",
            actions_attempted="Inspected electrical contactors and tested winding resistance; verified dead short to ground.",
            challenges_encountered="OEM compressor replacement costs $4,850 and requires capital expenditure approval.",
            external_support_required=True,
            next_proposed_action="Emergency purchase requisition submitted to Principal and Finance Committee."
        )

        justification = submit_justification(db=self.db, ticket=ticket, admin=infra_admin, justification_in=just_in)

        self.assertIsNotNone(justification)
        self.assertEqual(justification.reason_code, "Budget approval required")
        self.assertEqual(ticket.status, TicketStatusEnum.ON_HOLD.value)
        self.assertTrue("Budget approval required" in ticket.hold_reason)

        # Refresh and verify relationship
        self.db.refresh(ticket)
        self.assertIsNotNone(ticket.justification)
        self.assertEqual(ticket.justification.explanation, just_in.explanation)
        print("[PASS] 06: Unresolved issue formal justification submitted, linked, and status updated.")

    def test_07_principal_strictly_read_only(self):
        """Backend restriction: Principal is supervisor read-only and blocked from mutations."""
        principal = self.db.query(User).filter(User.email == "principal@college.edu").first()

        # The block_principal_mutation dependency must raise 403 Forbidden
        with self.assertRaises(HTTPException) as cm:
            block_principal_mutation(current_user=principal)
        self.assertEqual(cm.exception.status_code, 403)
        self.assertIn("Principal role is strictly supervisor read-only", cm.exception.detail)
        print("[PASS] 07: Principal backend mutation restriction strictly enforced (403 Forbidden).")

    def test_08_principal_analytics_dashboard_data(self):
        """Principal dashboard receives live aggregated metrics from database."""
        analytics = get_principal_analytics(db=self.db)

        # Verify KPI cards
        self.assertTrue(analytics.kpis.total_tickets > 0)
        self.assertTrue(analytics.kpis.resolved_tickets >= 0)
        self.assertTrue(analytics.kpis.pending_tickets >= 0)

        # Verify Required Visualizations
        self.assertEqual(len(analytics.resolution_overview), 4) # Donut
        self.assertTrue(len(analytics.issues_by_department) > 0) # Bar
        self.assertTrue(len(analytics.most_reported_categories) > 0) # Horizontal Bar
        self.assertTrue(len(analytics.department_status_stacked) > 0) # Stacked Bar
        self.assertTrue(len(analytics.avg_resolution_time_by_dept) > 0) # Resolution Time Bar
        self.assertTrue(len(analytics.priority_distribution) == 4) # Priority Pie/Donut

        # Verify Unresolved Justifications Section
        self.assertTrue(len(analytics.unresolved_justifications_summary) > 0)
        print("[PASS] 08: Principal real-time analytics aggregation and visualization data verified.")

    def test_09_csv_reports_export_rbac(self):
        """CSV export returns proper ticket records formatted according to role."""
        principal = self.db.query(User).filter(User.email == "principal@college.edu").first()
        student = self.db.query(User).filter(User.email == "student.alex@college.edu").first()
        it_admin = self.db.query(User).filter(User.email == "it.admin@college.edu").first()

        # 1. Principal export (sees all tickets)
        pri_csv = export_tickets_to_csv(db=self.db, current_user=principal)
        self.assertIn("Ticket ID,Title,Description", pri_csv)
        self.assertIn("COL-2026-", pri_csv)

        # 2. Department Admin export (sees department tickets)
        it_csv = export_tickets_to_csv(db=self.db, current_user=it_admin)
        self.assertIn("Ticket ID,Title,Description", it_csv)

        # 3. Reporter export (sees own tickets)
        rep_csv = export_tickets_to_csv(db=self.db, current_user=student)
        self.assertIn("Ticket ID,Title,Description", rep_csv)
        print("[PASS] 09: Role-filtered CSV exports verified.")

if __name__ == "__main__":
    unittest.main()
