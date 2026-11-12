import csv
import io
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Ticket, User

def export_tickets_to_csv(
    db: Session,
    current_user: User,
    department_id: Optional[int] = None,
    category_id: Optional[int] = None,
    priority: Optional[str] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> str:
    query = db.query(Ticket)

    user_role = current_user.role.name if current_user.role else ""

    # RBAC Data Scoping
    if user_role == "reporter":
        # Reporter can ONLY export their own tickets
        query = query.filter(Ticket.reporter_id == current_user.id)
    elif user_role == "department_admin":
        # Dept Admin can ONLY export tickets for their assigned department
        query = query.filter(Ticket.department_id == current_user.department_id)
    elif user_role == "principal":
        # Principal can view all, or filter by specific department
        if department_id:
            query = query.filter(Ticket.department_id == department_id)
    else:
        # Default safety: own tickets
        query = query.filter(Ticket.reporter_id == current_user.id)

    # Optional Filters
    if category_id:
        query = query.filter(Ticket.category_id == category_id)
    if priority:
        query = query.filter(Ticket.priority == priority.upper())
    if status_filter:
        query = query.filter(Ticket.status == status_filter.upper())
    if start_date:
        query = query.filter(Ticket.created_at >= start_date)
    if end_date:
        query = query.filter(Ticket.created_at <= end_date)

    tickets = query.order_by(Ticket.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "Ticket ID",
        "Title",
        "Description",
        "Reporter Name",
        "Reporter Email",
        "Reporter Role",
        "Assigned Department",
        "Category",
        "Subcategory",
        "Priority",
        "Status",
        "Created At",
        "Updated At",
        "Resolved At",
        "Resolution Notes",
        "Justification Reason",
        "Justification Explanation",
        "Actions Attempted",
        "Challenges Encountered"
    ])

    for t in tickets:
        writer.writerow([
            t.ticket_number,
            t.title,
            t.description.replace("\n", " "),
            t.reporter.full_name if t.reporter else "Unknown",
            t.reporter.email if t.reporter else "N/A",
            t.reporter.role.name if t.reporter and t.reporter.role else "reporter",
            t.department.name if t.department else "Unassigned",
            t.category.name if t.category else "N/A",
            t.subcategory.name if t.subcategory else "N/A",
            t.priority,
            t.status,
            t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
            t.updated_at.strftime("%Y-%m-%d %H:%M:%S") if t.updated_at else "",
            t.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if t.resolved_at else "",
            t.resolution_notes or "",
            t.justification.reason_code if t.justification else "",
            (t.justification.explanation.replace("\n", " ") if t.justification else ""),
            (t.justification.actions_attempted.replace("\n", " ") if t.justification else ""),
            (t.justification.challenges_encountered.replace("\n", " ") if t.justification else "")
        ])

    return output.getvalue()
