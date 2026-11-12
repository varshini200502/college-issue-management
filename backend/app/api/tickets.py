from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user, require_reporter, require_department_admin,
    block_principal_mutation
)
from app.models.models import (
    Ticket, TicketComment, TicketStatusHistory, TicketJustification,
    Department, Category, Subcategory, User, Role, TicketStatusEnum, PriorityEnum
)
from app.schemas.schemas import (
    TicketCreate, TicketResponse, TicketListResponse, TicketListItem,
    TicketStatusUpdate, TicketResolveRequest, TicketReopenRequest,
    JustificationCreate, JustificationResponse, CommentCreate, CommentResponse,
    UserSimple, DepartmentResponse, StatusHistoryResponse, DuplicateCheckResponse
)
from app.services.ticket_service import (
    create_ticket, update_ticket_status, resolve_ticket, reopen_ticket,
    submit_justification, add_ticket_comment, find_duplicate_ticket
)
from app.services.analytics_service import is_ticket_overdue

router = APIRouter(prefix="/tickets", tags=["Tickets"])

def format_ticket_detail(t: Ticket) -> TicketResponse:
    reporter_obj = UserSimple(
        id=t.reporter.id,
        email=t.reporter.email,
        full_name=t.reporter.full_name,
        role_name=t.reporter.role.name if t.reporter.role else "reporter",
        reporter_type=t.reporter.reporter_type,
        department_id=t.reporter.department_id,
        department_name=t.reporter.department.name if t.reporter.department else None
    )

    assigned_obj = None
    if t.assigned_to:
        assigned_obj = UserSimple(
            id=t.assigned_to.id,
            email=t.assigned_to.email,
            full_name=t.assigned_to.full_name,
            role_name=t.assigned_to.role.name if t.assigned_to.role else "department_admin",
            reporter_type=t.assigned_to.reporter_type,
            department_id=t.assigned_to.department_id,
            department_name=t.assigned_to.department.name if t.assigned_to.department else None
        )

    dept_obj = DepartmentResponse(
        id=t.department.id,
        name=t.department.name,
        code=t.department.code,
        description=t.department.description,
        is_active=t.department.is_active,
        created_at=t.department.created_at
    )

    comments_list = [
        CommentResponse(
            id=c.id,
            ticket_id=c.ticket_id,
            user_id=c.user_id,
            author_name=c.author.full_name if c.author else "User",
            author_role=c.author.role.name if c.author and c.author.role else "User",
            comment_text=c.comment_text,
            is_info_request=c.is_info_request,
            is_internal=c.is_internal,
            created_at=c.created_at
        )
        for c in t.comments
    ]

    history_list = [
        StatusHistoryResponse(
            id=h.id,
            ticket_id=h.ticket_id,
            changed_by_name=h.changed_by.full_name if h.changed_by else "System",
            changed_by_role=h.changed_by.role.name if h.changed_by and h.changed_by.role else "System",
            from_status=h.from_status,
            to_status=h.to_status,
            note=h.note,
            created_at=h.created_at
        )
        for h in t.status_history
    ]

    justification_obj = None
    if t.justification:
        justification_obj = JustificationResponse(
            id=t.justification.id,
            ticket_id=t.justification.ticket_id,
            admin_id=t.justification.admin_id,
            admin_name=t.justification.admin.full_name if t.justification.admin else "Admin",
            reason_code=t.justification.reason_code,
            explanation=t.justification.explanation,
            actions_attempted=t.justification.actions_attempted,
            challenges_encountered=t.justification.challenges_encountered,
            external_support_required=t.justification.external_support_required,
            next_proposed_action=t.justification.next_proposed_action,
            created_at=t.justification.created_at,
            updated_at=t.justification.updated_at
        )

    cat_dict = {"id": t.category.id, "name": t.category.name} if t.category else None
    return TicketResponse(
        id=t.id,
        ticket_number=t.ticket_number,
        title=t.title,
        description=t.description,
        reporter_id=t.reporter_id,
        reporter=reporter_obj,
        department_id=t.department_id,
        department=dept_obj,
        department_name=t.department.name if t.department else "Unassigned",
        category_id=t.category_id,
        category_name=t.category.name if t.category else "General",
        category=cat_dict,
        subcategory_id=t.subcategory_id,
        subcategory_name=t.subcategory.name if t.subcategory else None,
        assigned_to_id=t.assigned_to_id,
        assigned_to=assigned_obj,
        priority=t.priority,
        status=t.status,
        resolution_notes=t.resolution_notes,
        hold_reason=t.hold_reason,
        created_at=t.created_at,
        updated_at=t.updated_at,
        resolved_at=t.resolved_at,
        is_overdue=is_ticket_overdue(t),
        comments=comments_list,
        status_history=history_list,
        justification=justification_obj,
        attachments=[]
    )

@router.get("/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate(
    category_id: int = Query(..., ge=1),
    title: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if a similar unresolved ticket already exists for the reporter in this category.
    """
    dup = find_duplicate_ticket(db=db, reporter_id=current_user.id, category_id=category_id, title=title)
    if not dup:
        return DuplicateCheckResponse(is_duplicate=False)
    
    dup_item = TicketListItem(
        id=dup.id,
        ticket_number=dup.ticket_number,
        title=dup.title,
        reporter_name=dup.reporter.full_name if dup.reporter else "You",
        reporter_role=dup.reporter.role.name if dup.reporter and dup.reporter.role else "reporter",
        department_id=dup.department_id,
        department_name=dup.department.name if dup.department else "Unassigned",
        department={"id": dup.department.id, "name": dup.department.name} if dup.department else None,
        category_id=dup.category_id,
        category_name=dup.category.name if dup.category else "General",
        category={"id": dup.category.id, "name": dup.category.name} if dup.category else None,
        priority=dup.priority,
        status=dup.status,
        created_at=dup.created_at,
        updated_at=dup.updated_at,
        resolved_at=dup.resolved_at,
        has_justification=(dup.justification is not None),
        is_overdue=is_ticket_overdue(dup)
    )
    return DuplicateCheckResponse(
        is_duplicate=True,
        existing_ticket=dup_item,
        message=f"You already have an unresolved ticket {dup.ticket_number} ('{dup.title}') in this category with status {dup.status}."
    )

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def raise_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(require_reporter),
    db: Session = Depends(get_db)
):
    """
    Raise a new issue/ticket (Reporter only).
    Automatically routes to responsible department based on category.
    Principal is blocked from creating tickets.
    """
    ticket = create_ticket(db=db, reporter=current_user, ticket_in=ticket_in)
    return format_ticket_detail(ticket)

@router.get("", response_model=TicketListResponse)
def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    category_id: Optional[int] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    is_overdue: Optional[bool] = None,
    has_justification: Optional[bool] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List tickets with RBAC data isolation:
    - Reporter: only own tickets.
    - Department Admin: only own department's tickets.
    - Principal: all college tickets with full multi-dimensional filtering.
    """
    role_name = current_user.role.name if current_user.role else ""
    query = db.query(Ticket)

    # 1. RBAC Scope Enforcement
    if role_name == "reporter":
        query = query.filter(Ticket.reporter_id == current_user.id)
        # Demo isolation: reporter can only see tickets matching their own is_demo flag
        query = query.filter(Ticket.is_demo == current_user.is_demo)
    elif role_name == "department_admin":
        if not current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department admin account has no department assigned."
            )
        query = query.filter(Ticket.department_id == current_user.department_id)
        # Demo isolation: dept admin only sees tickets matching their own is_demo flag
        query = query.filter(Ticket.is_demo == current_user.is_demo)
    elif role_name == "principal":
        # Principal can view all, or choose to filter by department
        if department_id:
            query = query.filter(Ticket.department_id == department_id)
    else:
        query = query.filter(Ticket.reporter_id == current_user.id)
        query = query.filter(Ticket.is_demo == current_user.is_demo)

    # 2. Filters
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Ticket.ticket_number.ilike(search_fmt),
                Ticket.title.ilike(search_fmt),
                Ticket.description.ilike(search_fmt)
            )
        )
    if category_id:
        query = query.filter(Ticket.category_id == category_id)
    if priority:
        query = query.filter(Ticket.priority == priority.upper())
    if status:
        query = query.filter(Ticket.status == status.upper())
    if has_justification is not None:
        if has_justification:
            query = query.join(TicketJustification)
        else:
            query = query.outerjoin(TicketJustification).filter(TicketJustification.id == None)

    # 3. Sorting
    sort_col = getattr(Ticket, sort_by, Ticket.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    total = query.count()
    items_raw = query.offset((page - 1) * page_size).limit(page_size).all()

    items = [
        TicketListItem(
            id=t.id,
            ticket_number=t.ticket_number,
            title=t.title,
            reporter_name=t.reporter.full_name if t.reporter else "Unknown",
            reporter_role=t.reporter.role.name if t.reporter and t.reporter.role else "reporter",
            reporter={"id": t.reporter.id, "full_name": t.reporter.full_name, "email": t.reporter.email, "reporter_type": t.reporter.reporter_type} if t.reporter else None,
            department_id=t.department_id,
            department_name=t.department.name if t.department else "Unassigned",
            department={"id": t.department.id, "name": t.department.name} if t.department else None,
            category_id=t.category_id,
            category_name=t.category.name if t.category else "General",
            category={"id": t.category.id, "name": t.category.name} if t.category else None,
            priority=t.priority,
            status=t.status,
            created_at=t.created_at,
            updated_at=t.updated_at,
            resolved_at=t.resolved_at,
            has_justification=(t.justification is not None),
            justification={
                "id": t.justification.id,
                "reason_code": t.justification.reason_code,
                "explanation": t.justification.explanation,
                "actions_attempted": t.justification.actions_attempted,
                "challenges_encountered": t.justification.challenges_encountered,
                "external_support_required": t.justification.external_support_required,
                "next_proposed_action": t.justification.next_proposed_action,
                "created_at": t.justification.created_at.isoformat() if t.justification.created_at else None,
                "admin_name": t.justification.admin.full_name if t.justification.admin else "Dept Admin",
            } if t.justification else None,
            is_overdue=is_ticket_overdue(t)
        )
        for t in items_raw
    ]

    total_pages = (total + page_size - 1) // page_size if page_size else 1

    return TicketListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket_details(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    role_name = current_user.role.name if current_user.role else ""

    # RBAC Access Check
    if role_name == "reporter" and ticket.reporter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You can only view tickets submitted by yourself."
        )
    elif role_name == "department_admin" and ticket.department_id != current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Department administrators can only view tickets within their own department."
        )

    return format_ticket_detail(ticket)

@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_status(
    ticket_id: int,
    status_in: TicketStatusUpdate,
    current_user: User = Depends(require_department_admin),
    _: User = Depends(block_principal_mutation),
    db: Session = Depends(get_db)
):
    """
    Department Admin updates ticket status.
    Principal is blocked.
    Other department admins cannot modify this ticket.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket.department_id != current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update ticket belonging to another department."
        )

    updated_ticket = update_ticket_status(db=db, ticket=ticket, current_user=current_user, update_in=status_in)
    return format_ticket_detail(updated_ticket)

@router.post("/{ticket_id}/resolve", response_model=TicketResponse)
def mark_ticket_resolved(
    ticket_id: int,
    resolve_in: TicketResolveRequest,
    current_user: User = Depends(require_department_admin),
    _: User = Depends(block_principal_mutation),
    db: Session = Depends(get_db)
):
    """
    Resolve a ticket with mandatory resolution description.
    Principal is blocked.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket.department_id != current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot resolve ticket belonging to another department."
        )

    resolved = resolve_ticket(db=db, ticket=ticket, current_user=current_user, resolve_in=resolve_in)
    return format_ticket_detail(resolved)

@router.post("/{ticket_id}/reopen", response_model=TicketResponse)
def reopen_ticket_endpoint(
    ticket_id: int,
    reopen_in: TicketReopenRequest,
    current_user: User = Depends(require_reporter),
    _: User = Depends(block_principal_mutation),
    db: Session = Depends(get_db)
):
    """
    Reporter reopens their own resolved/closed ticket if problem persists.
    Principal is blocked.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket.reporter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only reopen tickets that you submitted."
        )

    reopened = reopen_ticket(db=db, ticket=ticket, current_user=current_user, reopen_in=reopen_in)
    return format_ticket_detail(reopened)

@router.post("/{ticket_id}/justification", response_model=JustificationResponse)
def submit_ticket_justification(
    ticket_id: int,
    justification_in: JustificationCreate,
    current_user: User = Depends(require_department_admin),
    _: User = Depends(block_principal_mutation),
    db: Session = Depends(get_db)
):
    """
    Department Admin submits formal justification for unresolved issue.
    Mandatory when ticket cannot be resolved.
    Principal is blocked.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket.department_id != current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot submit justification for ticket belonging to another department."
        )

    justification = submit_justification(
        db=db,
        ticket=ticket,
        admin=current_user,
        justification_in=justification_in
    )

    return JustificationResponse(
        id=justification.id,
        ticket_id=justification.ticket_id,
        admin_id=justification.admin_id,
        admin_name=current_user.full_name,
        reason_code=justification.reason_code,
        explanation=justification.explanation,
        actions_attempted=justification.actions_attempted,
        challenges_encountered=justification.challenges_encountered,
        external_support_required=justification.external_support_required,
        next_proposed_action=justification.next_proposed_action,
        created_at=justification.created_at,
        updated_at=justification.updated_at
    )

@router.post("/{ticket_id}/comments", response_model=CommentResponse)
def post_comment(
    ticket_id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(get_current_user),
    _: User = Depends(block_principal_mutation),
    db: Session = Depends(get_db)
):
    """
    Add a comment, response, or info request.
    Principal is strictly read-only and blocked from posting comments.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    role_name = current_user.role.name if current_user.role else ""

    if role_name == "reporter" and ticket.reporter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only comment on your own tickets."
        )
    elif role_name == "department_admin" and ticket.department_id != current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only comment on tickets belonging to your department."
        )

    comment = add_ticket_comment(
        db=db,
        ticket=ticket,
        current_user=current_user,
        comment_in=comment_in
    )

    return CommentResponse(
        id=comment.id,
        ticket_id=comment.ticket_id,
        user_id=comment.user_id,
        author_name=current_user.full_name,
        author_role=role_name,
        comment_text=comment.comment_text,
        is_info_request=comment.is_info_request,
        is_internal=comment.is_internal,
        created_at=comment.created_at
    )
