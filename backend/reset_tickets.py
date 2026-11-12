import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = "sqlite:///./test_college.db"

from app.core.database import SessionLocal
from app.models.models import (
    TicketAttachment, TicketComment, TicketStatusHistory,
    TicketJustification, Notification, Ticket,
    User, Role, Department, Category, Subcategory
)

def reset_tickets_only():
    db = SessionLocal()
    try:
        # Check current counts
        ticket_count = db.query(Ticket).count()
        comm_count = db.query(TicketComment).count()
        hist_count = db.query(TicketStatusHistory).count()
        just_count = db.query(TicketJustification).count()
        att_count = db.query(TicketAttachment).count()
        notif_count = db.query(Notification).count()

        print(f"[*] Pre-reset ticket data:")
        print(f"    - Tickets: {ticket_count}")
        print(f"    - Comments: {comm_count}")
        print(f"    - Status History: {hist_count}")
        print(f"    - Justifications: {just_count}")
        print(f"    - Attachments: {att_count}")
        print(f"    - Notifications: {notif_count}")

        # Delete in order of foreign key dependency
        db.query(TicketAttachment).delete()
        db.query(TicketComment).delete()
        db.query(TicketStatusHistory).delete()
        db.query(TicketJustification).delete()
        db.query(Notification).delete()
        db.query(Ticket).delete()
        db.commit()

        # Verify master data is intact
        users_count = db.query(User).count()
        roles_count = db.query(Role).count()
        dept_count = db.query(Department).count()
        cat_count = db.query(Category).count()
        subcat_count = db.query(Subcategory).count()
        remaining_tickets = db.query(Ticket).count()

        print("\n[✔] Ticket reset successful! Current master data:")
        print(f"    - Users preserved: {users_count}")
        print(f"    - Roles preserved: {roles_count}")
        print(f"    - Departments preserved: {dept_count}")
        print(f"    - Categories preserved: {cat_count}")
        print(f"    - Subcategories preserved: {subcat_count}")
        print(f"    - Tickets remaining: {remaining_tickets} (ZERO tickets ready for manual testing)")

    except Exception as e:
        db.rollback()
        print(f"[!] Error resetting tickets: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_tickets_only()
