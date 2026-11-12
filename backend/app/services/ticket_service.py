import re
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.models import (
    Ticket, TicketComment, TicketStatusHistory, TicketJustification,
    Category, Department, User, Role, TicketStatusEnum, PriorityEnum
)
from app.schemas.schemas import (
    TicketCreate, TicketStatusUpdate, TicketResolveRequest,
    TicketReopenRequest, JustificationCreate, CommentCreate
)
from app.services.notification_service import create_notification

def normalize_text(text: str) -> str:
    return re.sub(r"[^a-zA-Z0-9\s]", "", (text or "").lower()).strip()

def find_duplicate_ticket(db: Session, reporter_id: int, category_id: int, title: str) -> Optional[Ticket]:
    norm_new = normalize_text(title)
    if not norm_new:
        return None
    new_words = set(norm_new.split())

    open_tickets = db.query(Ticket).filter(
        Ticket.reporter_id == reporter_id,
        Ticket.category_id == category_id,
        Ticket.status.notin_([TicketStatusEnum.RESOLVED.value, TicketStatusEnum.CLOSED.value])
    ).all()

    for ot in open_tickets:
        norm_ot = normalize_text(ot.title)
        if norm_new == norm_ot:
            return ot
        if len(norm_new) >= 6 and (norm_new in norm_ot or norm_ot in norm_new):
            return ot
        ot_words = set(norm_ot.split())
        if new_words and ot_words:
            overlap = len(new_words.intersection(ot_words)) / max(len(new_words), len(ot_words))
            if overlap >= 0.6:
                return ot
    return None

def generate_ticket_number(db: Session) -> str:
    current_year = datetime.now(timezone.utc).year
    prefix = f"COL-{current_year}-"
    
    # Find highest sequence for current year
    latest_ticket = (
        db.query(Ticket)
        .filter(Ticket.ticket_number.like(f"{prefix}%"))
        .order_by(Ticket.id.desc())
        .first()
    )
    
    seq = 1
    if latest_ticket and latest_ticket.ticket_number:
        try:
            parts = latest_ticket.ticket_number.split("-")
            if len(parts) == 3 and parts[2].isdigit():
                seq = int(parts[2]) + 1
        except Exception:
            seq = db.query(Ticket).count() + 1
    else:
        seq = db.query(Ticket).count() + 1
        
    return f"{prefix}{seq:04d}"

def create_ticket(db: Session, reporter: User, ticket_in: TicketCreate) -> Ticket:
    # 1. Fetch category from DB to determine responsible department automatically
    category = db.query(Category).filter(Category.id == ticket_in.category_id, Category.is_active == True).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with id {ticket_in.category_id} not found or inactive."
        )
    
    department_id = category.department_id
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Responsible department for category '{category.name}' does not exist."
        )

    # 1.5 Duplicate Ticket Check for Reporter
    if not getattr(ticket_in, "confirm_duplicate", False):
        dup = find_duplicate_ticket(db, reporter.id, category.id, ticket_in.title)
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Similar unresolved ticket exists: {dup.ticket_number} ('{dup.title}') with status {dup.status}. Confirm to submit anyway."
            )

    # 2. Generate unique Ticket Number
    ticket_number = generate_ticket_number(db)

    # 3. Create Ticket
    new_ticket = Ticket(
        ticket_number=ticket_number,
        title=ticket_in.title.strip(),
        description=ticket_in.description.strip(),
        reporter_id=reporter.id,
        department_id=department_id,
        category_id=category.id,
        subcategory_id=ticket_in.subcategory_id,
        priority=ticket_in.priority.upper() if ticket_in.priority else PriorityEnum.MEDIUM.value,
        status=TicketStatusEnum.NEW.value,
        is_demo=getattr(reporter, 'is_demo', False)  # Inherit demo flag from reporter
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    # 4. Record Initial Status History
    history = TicketStatusHistory(
        ticket_id=new_ticket.id,
        changed_by_id=reporter.id,
        from_status=None,
        to_status=TicketStatusEnum.NEW.value,
        note=f"Ticket submitted and automatically routed to {department.name}."
    )
    db.add(history)
    db.commit()

    # 5. Notify Reporter
    create_notification(
        db=db,
        user_id=reporter.id,
        ticket_id=new_ticket.id,
        title="Ticket Created Successfully",
        message=f"Your ticket {ticket_number} has been logged and assigned to {department.name}.",
        notification_type="TICKET_CREATED"
    )

    # 6. Notify Department Admins
    dept_admins = db.query(User).join(Role).filter(
        Role.name == "department_admin",
        User.department_id == department_id,
        User.is_active == True
    ).all()
    for admin in dept_admins:
        create_notification(
            db=db,
            user_id=admin.id,
            ticket_id=new_ticket.id,
            title="New Ticket Assigned",
            message=f"New ticket {ticket_number}: '{new_ticket.title}' assigned to {department.name}.",
            notification_type="TICKET_CREATED"
        )

    return new_ticket

def update_ticket_status(
    db: Session,
    ticket: Ticket,
    current_user: User,
    update_in: TicketStatusUpdate
) -> Ticket:
    prev_status = ticket.status
    target_status = update_in.status.upper()

    # Validation: If marking ON_HOLD, hold_reason is mandatory
    if target_status == TicketStatusEnum.ON_HOLD.value:
        if not update_in.hold_reason or len(update_in.hold_reason.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid hold reason (minimum 5 characters) is required to place a ticket on hold."
            )
        ticket.hold_reason = update_in.hold_reason.strip()

    ticket.status = target_status
    ticket.updated_at = datetime.now(timezone.utc)

    # Log history
    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by_id=current_user.id,
        from_status=prev_status,
        to_status=target_status,
        note=update_in.note or update_in.hold_reason
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    # Notify Reporter
    create_notification(
        db=db,
        user_id=ticket.reporter_id,
        ticket_id=ticket.id,
        title=f"Ticket Status Updated: {ticket.ticket_number}",
        message=f"Status changed from {prev_status} to {target_status} by {current_user.full_name} ({current_user.role.name}).",
        notification_type="STATUS_CHANGED"
    )

    return ticket

def resolve_ticket(
    db: Session,
    ticket: Ticket,
    current_user: User,
    resolve_in: TicketResolveRequest
) -> Ticket:
    # Rule: Must provide resolution description
    if not resolve_in.resolution_notes or len(resolve_in.resolution_notes.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mandatory resolution description (minimum 10 characters) must be provided to resolve this ticket."
        )

    prev_status = ticket.status
    ticket.status = TicketStatusEnum.RESOLVED.value
    ticket.resolution_notes = resolve_in.resolution_notes.strip()
    ticket.resolved_at = datetime.now(timezone.utc)
    ticket.updated_at = datetime.now(timezone.utc)

    # Status History
    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by_id=current_user.id,
        from_status=prev_status,
        to_status=TicketStatusEnum.RESOLVED.value,
        note=f"Resolved with notes: {resolve_in.resolution_notes.strip()}"
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    # Notify Reporter
    create_notification(
        db=db,
        user_id=ticket.reporter_id,
        ticket_id=ticket.id,
        title=f"Ticket Resolved: {ticket.ticket_number}",
        message=f"Your ticket '{ticket.title}' has been resolved. Resolution: {ticket.resolution_notes[:100]}...",
        notification_type="TICKET_RESOLVED"
    )

    return ticket

def reopen_ticket(
    db: Session,
    ticket: Ticket,
    current_user: User,
    reopen_in: TicketReopenRequest
) -> Ticket:
    # Rule: Ticket must have been in RESOLVED or CLOSED status to be reopened
    if ticket.status not in [TicketStatusEnum.RESOLVED.value, TicketStatusEnum.CLOSED.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only tickets with RESOLVED or CLOSED status can be reopened. Current status: {ticket.status}."
        )

    prev_status = ticket.status
    ticket.status = TicketStatusEnum.REOPENED.value
    ticket.updated_at = datetime.now(timezone.utc)

    # Status History
    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by_id=current_user.id,
        from_status=prev_status,
        to_status=TicketStatusEnum.REOPENED.value,
        note=f"Reopened by reporter. Reason: {reopen_in.note.strip()}"
    )
    db.add(history)

    # Add as a comment as well
    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        comment_text=f"[Issue Reopened] {reopen_in.note.strip()}",
        is_info_request=False,
        is_internal=False
    )
    db.add(comment)
    db.commit()
    db.refresh(ticket)

    # Notify Department Admins
    dept_admins = db.query(User).join(Role).filter(
        Role.name == "department_admin",
        User.department_id == ticket.department_id,
        User.is_active == True
    ).all()
    for admin in dept_admins:
        create_notification(
            db=db,
            user_id=admin.id,
            ticket_id=ticket.id,
            title=f"Ticket Reopened: {ticket.ticket_number}",
            message=f"Ticket {ticket.ticket_number} was reopened by reporter {current_user.full_name}. Reason: {reopen_in.note.strip()}",
            notification_type="TICKET_REOPENED"
        )

    return ticket

def submit_justification(
    db: Session,
    ticket: Ticket,
    admin: User,
    justification_in: JustificationCreate
) -> TicketJustification:
    # Check if justification already exists
    existing = db.query(TicketJustification).filter(TicketJustification.ticket_id == ticket.id).first()
    if existing:
        existing.reason_code = justification_in.reason_code
        existing.explanation = justification_in.explanation.strip()
        existing.actions_attempted = justification_in.actions_attempted.strip()
        existing.challenges_encountered = justification_in.challenges_encountered.strip()
        existing.external_support_required = justification_in.external_support_required
        existing.next_proposed_action = justification_in.next_proposed_action.strip() if justification_in.next_proposed_action else None
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        justification = existing
    else:
        justification = TicketJustification(
            ticket_id=ticket.id,
            admin_id=admin.id,
            reason_code=justification_in.reason_code,
            explanation=justification_in.explanation.strip(),
            actions_attempted=justification_in.actions_attempted.strip(),
            challenges_encountered=justification_in.challenges_encountered.strip(),
            external_support_required=justification_in.external_support_required,
            next_proposed_action=justification_in.next_proposed_action.strip() if justification_in.next_proposed_action else None
        )
        db.add(justification)
        db.commit()
        db.refresh(justification)

    # Set ticket status to ON_HOLD if currently not on hold or in progress
    prev_status = ticket.status
    ticket.status = TicketStatusEnum.ON_HOLD.value
    ticket.hold_reason = f"Unresolved justification provided: {justification_in.reason_code}"
    ticket.updated_at = datetime.now(timezone.utc)

    # History
    history = TicketStatusHistory(
        ticket_id=ticket.id,
        changed_by_id=admin.id,
        from_status=prev_status,
        to_status=TicketStatusEnum.ON_HOLD.value,
        note=f"Formal unresolved justification submitted. Reason: {justification_in.reason_code}. Explanation: {justification_in.explanation[:120]}..."
    )
    db.add(history)
    db.commit()

    # Notify Reporter
    create_notification(
        db=db,
        user_id=ticket.reporter_id,
        ticket_id=ticket.id,
        title=f"Unresolved Justification Submitted: {ticket.ticket_number}",
        message=f"{ticket.department.name} submitted a formal justification for ticket {ticket.ticket_number}: '{justification_in.reason_code}'.",
        notification_type="JUSTIFICATION_SUBMITTED"
    )

    # Notify Principal
    principals = db.query(User).join(Role).filter(Role.name == "principal", User.is_active == True).all()
    for p in principals:
        create_notification(
            db=db,
            user_id=p.id,
            ticket_id=ticket.id,
            title=f"Unresolved Ticket Justification: {ticket.ticket_number}",
            message=f"{ticket.department.name} flagged ticket {ticket.ticket_number} as unresolved. Reason: {justification_in.reason_code}.",
            notification_type="JUSTIFICATION_SUBMITTED"
        )

    return justification

def add_ticket_comment(
    db: Session,
    ticket: Ticket,
    current_user: User,
    comment_in: CommentCreate
) -> TicketComment:
    comment = TicketComment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        comment_text=comment_in.comment_text.strip(),
        is_info_request=comment_in.is_info_request,
        is_internal=comment_in.is_internal
    )
    db.add(comment)

    # If it is an info request, automatically update ticket status to WAITING_FOR_INFO
    if comment_in.is_info_request and ticket.status != TicketStatusEnum.WAITING_FOR_INFO.value:
        prev_status = ticket.status
        ticket.status = TicketStatusEnum.WAITING_FOR_INFO.value
        ticket.updated_at = datetime.now(timezone.utc)
        history = TicketStatusHistory(
            ticket_id=ticket.id,
            changed_by_id=current_user.id,
            from_status=prev_status,
            to_status=TicketStatusEnum.WAITING_FOR_INFO.value,
            note=f"Department requested additional information: {comment_in.comment_text[:100]}..."
        )
        db.add(history)

    db.commit()
    db.refresh(comment)

    # Notification logic
    is_reporter = (current_user.id == ticket.reporter_id)
    if is_reporter:
        # Notify Department Admins
        dept_admins = db.query(User).join(Role).filter(
            Role.name == "department_admin",
            User.department_id == ticket.department_id,
            User.is_active == True
        ).all()
        for admin in dept_admins:
            create_notification(
                db=db,
                user_id=admin.id,
                ticket_id=ticket.id,
                title=f"Reporter Responded on {ticket.ticket_number}",
                message=f"{current_user.full_name}: {comment_in.comment_text[:120]}",
                notification_type="NEW_COMMENT"
            )
    else:
        # Notify Reporter
        notif_title = "Information Requested by Department" if comment_in.is_info_request else f"New Update on Ticket {ticket.ticket_number}"
        create_notification(
            db=db,
            user_id=ticket.reporter_id,
            ticket_id=ticket.id,
            title=notif_title,
            message=f"{current_user.full_name} ({ticket.department.name}): {comment_in.comment_text[:120]}",
            notification_type="INFO_REQUESTED" if comment_in.is_info_request else "NEW_COMMENT"
        )

    return comment
