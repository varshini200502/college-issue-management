import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.core.security import verify_password
from app.models.models import User, Ticket, Department, Category, TicketStatusEnum, PriorityEnum
from app.services.analytics_service import get_principal_analytics, get_department_analytics
from app.services.ticket_service import create_ticket
from app.schemas.schemas import TicketCreate

def test_full_integration():
    db = SessionLocal()
    try:
        print("[*] Running End-to-End Live PostgreSQL Integration Checks...")

        # 1. Verify Sample Tickets
        tickets = db.query(Ticket).all()
        print(f"[✔] Total tickets in database: {len(tickets)}")
        assert len(tickets) >= 2, "Expected at least 2 tickets"

        t1 = db.query(Ticket).filter(Ticket.ticket_number == "COL-2026-0001").first()
        t2 = db.query(Ticket).filter(Ticket.ticket_number == "COL-2026-0002").first()
        assert t1 is not None and t1.status in ["IN_PROGRESS", "RESOLVED"], f"Ticket COL-2026-0001 must exist and have valid status, got {t1.status}"
        assert t2 is not None and t2.status == "RESOLVED", "Ticket COL-2026-0002 must exist and be RESOLVED"
        assert t2.resolution_notes, "Ticket COL-2026-0002 must have resolution description"
        print(f"[✔] Sample tickets verified: COL-2026-0001 ({t1.status}) and COL-2026-0002 (RESOLVED)")

        # 2. Verify Authentication for All 3 Roles
        users_to_verify = [
            ("student.alex@college.edu", "Student@123", "reporter"),
            ("it.admin@college.edu", "Admin@123", "department_admin"),
            ("finance.admin@college.edu", "Admin@123", "department_admin"),
            ("principal@college.edu", "Admin@123", "principal")
        ]
        for email, pwd, expected_role in users_to_verify:
            u = db.query(User).filter(User.email == email).first()
            assert u is not None, f"User {email} missing"
            assert verify_password(pwd, u.hashed_password), f"Password check failed for {email}"
            assert u.role.name == expected_role, f"Role mismatch for {email}"
        print("[✔] Authentication & password hashing verified for all 3 user roles")

        # 3. Verify Live Principal Analytics
        p_analytics = get_principal_analytics(db)
        print(f"[✔] Principal Analytics KPIs: Total={p_analytics.kpis.total_tickets}, Resolved={p_analytics.kpis.resolved_tickets}, InProgress={p_analytics.kpis.in_progress_tickets}")
        assert p_analytics.kpis.total_tickets >= 2
        assert len(p_analytics.resolution_overview) == 4
        assert len(p_analytics.issues_by_department) > 0
        assert len(p_analytics.priority_distribution) == 4
        print("[✔] Principal Real-Time Analytics aggregation verified against live PostgreSQL data")

        # 4. Verify Department Analytics
        it_dept = db.query(Department).filter(Department.code == "IT").first()
        dept_analytics = get_department_analytics(db, department_id=it_dept.id)
        assert dept_analytics.kpis.total_tickets >= 1
        print(f"[✔] IT Department Analytics verified: Total={dept_analytics.kpis.total_tickets}, InProgress={dept_analytics.kpis.in_progress_tickets}")

        print("\n[🎉] ALL INTEGRATION CHECKS PASSED SUCCESSFULLY ON POSTGRESQL!")

    finally:
        db.close()

if __name__ == '__main__':
    test_full_integration()
