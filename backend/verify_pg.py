import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal
from app.models.models import User, Department, Category, Ticket, TicketStatusHistory, TicketComment

def verify_live_postgres():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        departments = db.query(Department).all()
        categories = db.query(Category).all()
        tickets = db.query(Ticket).all()

        print("[*] LIVE POSTGRESQL VERIFICATION ('college_issue_db'):")
        print(f"    - Total Users: {len(users)}")
        print(f"    - Total Departments: {len(departments)}")
        print(f"    - Total Categories: {len(categories)}")
        print(f"    - Total Tickets: {len(tickets)}")

        for t in tickets:
            print(f"\n    Ticket {t.ticket_number}:")
            print(f"      Title: {t.title}")
            print(f"      Department: {t.department.name}")
            print(f"      Category: {t.category.name}")
            print(f"      Reporter: {t.reporter.full_name} ({t.reporter.email})")
            print(f"      Priority: {t.priority}")
            print(f"      Status: {t.status}")
            if t.resolution_notes:
                print(f"      Resolution Notes: {t.resolution_notes[:80]}...")
            print(f"      Status History Count: {len(t.status_history)}")
            print(f"      Comments Count: {len(t.comments)}")

        assert len(tickets) == 2, f"Expected exactly 2 initial tickets, found {len(tickets)}"
        t1 = next(t for t in tickets if t.ticket_number == "COL-2026-0001")
        t2 = next(t for t in tickets if t.ticket_number == "COL-2026-0002")
        assert t1.status == "IN_PROGRESS", f"Ticket 1 must be IN_PROGRESS, got {t1.status}"
        assert t2.status == "RESOLVED", f"Ticket 2 must be RESOLVED, got {t2.status}"
        assert t2.resolution_notes is not None, "Ticket 2 must have resolution notes"
        print("\n[✔] Live PostgreSQL verification passed completely! Exactly 2 initial tickets verified.")

    finally:
        db.close()

if __name__ == '__main__':
    verify_live_postgres()
