from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, case, or_, and_

from app.models.models import (
    Ticket, Department, Category, User, Role,
    TicketJustification, TicketStatusEnum, PriorityEnum
)
from app.schemas.schemas import (
    PrincipalAnalyticsResponse, DepartmentAnalyticsResponse,
    ReporterAnalyticsResponse, KPICardData, ChartItem,
    DepartmentIssueCount, TrendItem, CategoryReportItem,
    ResolutionTimeItem, TicketListItem
)

SLA_HOURS = {
    PriorityEnum.CRITICAL.value: 24,
    PriorityEnum.HIGH.value: 48,
    PriorityEnum.MEDIUM.value: 96,
    PriorityEnum.LOW.value: 168
}

def is_ticket_overdue(ticket: Ticket) -> bool:
    if ticket.status in [TicketStatusEnum.RESOLVED.value, TicketStatusEnum.CLOSED.value]:
        return False
    
    sla = SLA_HOURS.get(ticket.priority, 96)
    created = ticket.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    return (now - created).total_seconds() > (sla * 3600)

def calculate_resolution_hours(ticket: Ticket) -> Optional[float]:
    if not ticket.resolved_at or not ticket.created_at:
        return None
    created = ticket.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    resolved = ticket.resolved_at
    if resolved.tzinfo is None:
        resolved = resolved.replace(tzinfo=timezone.utc)
    diff = (resolved - created).total_seconds() / 3600.0
    return max(0.1, round(diff, 1))

def get_principal_analytics(
    db: Session,
    department_id: Optional[int] = None,
    category_id: Optional[int] = None,
    priority: Optional[str] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> PrincipalAnalyticsResponse:
    query = db.query(Ticket)

    if department_id:
        query = query.filter(Ticket.department_id == department_id)
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

    tickets = query.all()
    total_tickets = len(tickets)

    resolved_count = 0
    pending_count = 0
    in_progress_count = 0
    unresolved_count = 0
    overdue_count = 0
    resolution_times = []

    priority_counts = {PriorityEnum.LOW.value: 0, PriorityEnum.MEDIUM.value: 0, PriorityEnum.HIGH.value: 0, PriorityEnum.CRITICAL.value: 0}
    status_counts = {
        TicketStatusEnum.NEW.value: 0,
        TicketStatusEnum.ASSIGNED.value: 0,
        TicketStatusEnum.IN_PROGRESS.value: 0,
        TicketStatusEnum.WAITING_FOR_INFO.value: 0,
        TicketStatusEnum.ON_HOLD.value: 0,
        TicketStatusEnum.RESOLVED.value: 0,
        TicketStatusEnum.CLOSED.value: 0,
        TicketStatusEnum.REOPENED.value: 0,
    }

    overdue_tickets_list = []
    
    for t in tickets:
        st = t.status
        status_counts[st] = status_counts.get(st, 0) + 1
        
        pr = t.priority
        priority_counts[pr] = priority_counts.get(pr, 0) + 1

        if st in [TicketStatusEnum.RESOLVED.value, TicketStatusEnum.CLOSED.value]:
            resolved_count += 1
            hrs = calculate_resolution_hours(t)
            if hrs is not None:
                resolution_times.append(hrs)
        elif st in [TicketStatusEnum.NEW.value, TicketStatusEnum.ASSIGNED.value, TicketStatusEnum.WAITING_FOR_INFO.value, TicketStatusEnum.REOPENED.value]:
            pending_count += 1
        elif st == TicketStatusEnum.IN_PROGRESS.value:
            in_progress_count += 1
        elif st == TicketStatusEnum.ON_HOLD.value:
            unresolved_count += 1

        if is_ticket_overdue(t):
            overdue_count += 1
            if len(overdue_tickets_list) < 15:
                overdue_tickets_list.append(
                    TicketListItem(
                        id=t.id,
                        ticket_number=t.ticket_number,
                        title=t.title,
                        reporter_name=t.reporter.full_name if t.reporter else "Unknown",
                        reporter_role=t.reporter.role.name if t.reporter and t.reporter.role else "reporter",
                        reporter={"id": t.reporter.id, "full_name": t.reporter.full_name} if t.reporter else None,
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
                        is_overdue=True
                    )
                )

    avg_resolution_hours = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0.0

    kpis = KPICardData(
        total_tickets=total_tickets,
        resolved_tickets=resolved_count,
        pending_tickets=pending_count,
        in_progress_tickets=in_progress_count,
        unresolved_tickets=unresolved_count,
        overdue_tickets=overdue_count,
        avg_resolution_hours=avg_resolution_hours,
        total=total_tickets,
        resolved=resolved_count,
        pending=pending_count,
        in_progress=in_progress_count,
        unresolved=unresolved_count,
        overdue=overdue_count,
        unresolved_justified=unresolved_count
    )

    # 1. Donut: Resolution Overview
    resolution_overview = [
        ChartItem(name="Resolved", value=resolved_count, color="#10B981"),
        ChartItem(name="In Progress", value=in_progress_count, color="#F59E0B"),
        ChartItem(name="Pending", value=pending_count, color="#3B82F6"),
        ChartItem(name="On Hold / Unresolved", value=unresolved_count, color="#6B7280"),
    ]

    # 2. Issues by Department & 5. Stacked Bar Status
    all_departments = db.query(Department).filter(Department.is_active == True).all()
    dept_map = {d.id: d.name for d in all_departments}
    
    dept_stats: Dict[int, Dict[str, Any]] = {
        d.id: {"name": d.name, "total": 0, "resolved": 0, "pending": 0, "in_progress": 0, "unresolved": 0, "res_times": []}
        for d in all_departments
    }

    for t in tickets:
        d_id = t.department_id
        if d_id in dept_stats:
            dept_stats[d_id]["total"] += 1
            st = t.status
            if st in [TicketStatusEnum.RESOLVED.value, TicketStatusEnum.CLOSED.value]:
                dept_stats[d_id]["resolved"] += 1
                hrs = calculate_resolution_hours(t)
                if hrs is not None:
                    dept_stats[d_id]["res_times"].append(hrs)
            elif st in [TicketStatusEnum.NEW.value, TicketStatusEnum.ASSIGNED.value, TicketStatusEnum.WAITING_FOR_INFO.value, TicketStatusEnum.REOPENED.value]:
                dept_stats[d_id]["pending"] += 1
            elif st == TicketStatusEnum.IN_PROGRESS.value:
                dept_stats[d_id]["in_progress"] += 1
            elif st == TicketStatusEnum.ON_HOLD.value:
                dept_stats[d_id]["unresolved"] += 1

    issues_by_department = [
        DepartmentIssueCount(
            department=data["name"],
            total=data["total"],
            resolved=data["resolved"],
            pending=data["pending"],
            in_progress=data["in_progress"],
            unresolved=data["unresolved"]
        )
        for data in dept_stats.values()
    ]

    department_status_stacked = issues_by_department

    # 6. Avg Resolution Time by Department
    avg_resolution_time_by_dept = [
        ResolutionTimeItem(
            department=data["name"],
            avg_hours=round(sum(data["res_times"]) / len(data["res_times"]), 1) if data["res_times"] else 0.0
        )
        for data in dept_stats.values()
    ]

    # 3. Issue Trends over days (past 14 days or dynamic)
    trend_dict: Dict[str, Dict[str, int]] = {}
    for t in tickets:
        d_str = t.created_at.strftime("%Y-%m-%d")
        if d_str not in trend_dict:
            trend_dict[d_str] = {"count": 0, "resolved": 0}
        trend_dict[d_str]["count"] += 1
        if t.status in [TicketStatusEnum.RESOLVED.value, TicketStatusEnum.CLOSED.value]:
            trend_dict[d_str]["resolved"] += 1

    sorted_trends = sorted(trend_dict.items(), key=lambda x: x[0])
    issue_trends = [
        TrendItem(date=d, count=val["count"], resolved=val["resolved"])
        for d, val in sorted_trends[-14:] # Last 14 days of activity
    ]

    # 4. Most Reported Categories (Horizontal Bar Chart)
    cat_counts: Dict[int, int] = {}
    for t in tickets:
        cat_counts[t.category_id] = cat_counts.get(t.category_id, 0) + 1
    
    all_categories = db.query(Category).all()
    cat_lookup = {c.id: (c.name, dept_map.get(c.department_id, "General")) for c in all_categories}
    
    sorted_cats = sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    most_reported_categories = [
        CategoryReportItem(
            category=cat_lookup.get(c_id, (f"Category {c_id}", "Dept"))[0],
            department=cat_lookup.get(c_id, (f"Category {c_id}", "Dept"))[1],
            count=cnt
        )
        for c_id, cnt in sorted_cats
    ]

    # 7. Priority Distribution Chart
    priority_colors = {
        PriorityEnum.CRITICAL.value: "#EF4444",
        PriorityEnum.HIGH.value: "#F97316",
        PriorityEnum.MEDIUM.value: "#3B82F6",
        PriorityEnum.LOW.value: "#9CA3AF"
    }
    priority_distribution = [
        ChartItem(name=k, value=v, color=priority_colors.get(k, "#6B7280"))
        for k, v in priority_counts.items()
    ]

    # Highest Pending Departments
    highest_pending_departments = sorted(
        [ChartItem(name=d["name"], value=d["pending"] + d["in_progress"]) for d in dept_stats.values()],
        key=lambda x: x.value,
        reverse=True
    )[:5]

    # Recent Tickets
    recent_query = query.order_by(Ticket.created_at.desc()).limit(10).all()
    recent_tickets = [
        TicketListItem(
            id=t.id,
            ticket_number=t.ticket_number,
            title=t.title,
            reporter_name=t.reporter.full_name if t.reporter else "Unknown",
            reporter_role=t.reporter.role.name if t.reporter and t.reporter.role else "reporter",
            reporter={"id": t.reporter.id, "full_name": t.reporter.full_name} if t.reporter else None,
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
            is_overdue=is_ticket_overdue(t)
        )
        for t in recent_query
    ]

    # Unresolved Justifications Summary
    justifications_records = (
        db.query(TicketJustification)
        .join(Ticket)
        .order_by(TicketJustification.created_at.desc())
        .limit(15)
        .all()
    )
    unresolved_justifications_summary = [
        {
            "id": j.id,
            "ticket_id": j.ticket_id,
            "ticket_number": j.ticket.ticket_number,
            "ticket_title": j.ticket.title,
            "department_name": j.ticket.department.name if j.ticket.department else "N/A",
            "admin_name": j.admin.full_name if j.admin else "Dept Admin",
            "reason_code": j.reason_code,
            "explanation": j.explanation,
            "actions_attempted": j.actions_attempted,
            "challenges_encountered": j.challenges_encountered,
            "external_support_required": j.external_support_required,
            "next_proposed_action": j.next_proposed_action,
            "created_at": j.created_at.isoformat()
        }
        for j in justifications_records
    ]

    return PrincipalAnalyticsResponse(
        kpis=kpis,
        resolution_overview=resolution_overview,
        issues_by_department=issues_by_department,
        issue_trends=issue_trends,
        most_reported_categories=most_reported_categories,
        department_status_stacked=department_status_stacked,
        avg_resolution_time_by_dept=avg_resolution_time_by_dept,
        priority_distribution=priority_distribution,
        recent_tickets=recent_tickets,
        highest_pending_departments=highest_pending_departments,
        overdue_tickets=overdue_tickets_list,
        unresolved_justifications_summary=unresolved_justifications_summary,
        # Frontend aliases
        donut_data=resolution_overview,
        dept_bar=issues_by_department,
        trends=issue_trends,
        categories_bar=most_reported_categories,
        dept_stacked=department_status_stacked,
        resolution_time=avg_resolution_time_by_dept,
        priority_dist=priority_distribution,
    )

def get_department_analytics(db: Session, department_id: int) -> DepartmentAnalyticsResponse:
    dept = db.query(Department).filter(Department.id == department_id).first()
    dept_name = dept.name if dept else f"Department {department_id}"

    tickets = db.query(Ticket).filter(Ticket.department_id == department_id).all()
    total_received = len(tickets)

    new_count = 0
    in_progress_count = 0
    resolved_count = 0
    pending_count = 0
    overdue_count = 0
    resolution_times = []

    priority_counts = {PriorityEnum.LOW.value: 0, PriorityEnum.MEDIUM.value: 0, PriorityEnum.HIGH.value: 0, PriorityEnum.CRITICAL.value: 0}
    status_counts = {
        TicketStatusEnum.NEW.value: 0,
        TicketStatusEnum.ASSIGNED.value: 0,
        TicketStatusEnum.IN_PROGRESS.value: 0,
        TicketStatusEnum.WAITING_FOR_INFO.value: 0,
        TicketStatusEnum.ON_HOLD.value: 0,
        TicketStatusEnum.RESOLVED.value: 0,
        TicketStatusEnum.CLOSED.value: 0,
        TicketStatusEnum.REOPENED.value: 0,
    }
    cat_counts: Dict[str, int] = {}
    trend_dict: Dict[str, int] = {}

    for t in tickets:
        st = t.status
        status_counts[st] = status_counts.get(st, 0) + 1

        pr = t.priority
        priority_counts[pr] = priority_counts.get(pr, 0) + 1

        c_name = t.category.name if t.category else "General"
        cat_counts[c_name] = cat_counts.get(c_name, 0) + 1

        d_str = t.created_at.strftime("%Y-%m-%d")
        trend_dict[d_str] = trend_dict.get(d_str, 0) + 1

        if st == TicketStatusEnum.NEW.value:
            new_count += 1
            pending_count += 1
        elif st in [TicketStatusEnum.ASSIGNED.value, TicketStatusEnum.WAITING_FOR_INFO.value, TicketStatusEnum.REOPENED.value]:
            pending_count += 1
        elif st == TicketStatusEnum.IN_PROGRESS.value:
            in_progress_count += 1
        elif st in [TicketStatusEnum.RESOLVED.value, TicketStatusEnum.CLOSED.value]:
            resolved_count += 1
            hrs = calculate_resolution_hours(t)
            if hrs is not None:
                resolution_times.append(hrs)

        if is_ticket_overdue(t):
            overdue_count += 1

    avg_resolution_hours = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0.0

    kpis = KPICardData(
        total_tickets=total_received,
        resolved_tickets=resolved_count,
        pending_tickets=pending_count,
        in_progress_tickets=in_progress_count,
        unresolved_tickets=status_counts.get(TicketStatusEnum.ON_HOLD.value, 0),
        overdue_tickets=overdue_count,
        avg_resolution_hours=avg_resolution_hours
    )

    status_colors = {
        TicketStatusEnum.NEW.value: "#3B82F6",
        TicketStatusEnum.ASSIGNED.value: "#8B5CF6",
        TicketStatusEnum.IN_PROGRESS.value: "#F59E0B",
        TicketStatusEnum.WAITING_FOR_INFO.value: "#EAB308",
        TicketStatusEnum.ON_HOLD.value: "#6B7280",
        TicketStatusEnum.RESOLVED.value: "#10B981",
        TicketStatusEnum.CLOSED.value: "#047857",
        TicketStatusEnum.REOPENED.value: "#EF4444",
    }

    status_distribution = [
        ChartItem(name=k, value=v, color=status_colors.get(k, "#6B7280"))
        for k, v in status_counts.items() if v > 0
    ]

    category_breakdown = [
        ChartItem(name=k, value=v)
        for k, v in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    ]

    priority_distribution = [
        ChartItem(name=k, value=v)
        for k, v in priority_counts.items()
    ]

    sorted_trends = sorted(trend_dict.items(), key=lambda x: x[0])
    trends = [TrendItem(date=d, count=cnt, resolved=0) for d, cnt in sorted_trends[-14:]]

    recent_dept_tickets = (
        db.query(Ticket)
        .filter(Ticket.department_id == department_id)
        .order_by(Ticket.created_at.desc())
        .limit(10)
        .all()
    )
    recent_tickets = [
        TicketListItem(
            id=t.id,
            ticket_number=t.ticket_number,
            title=t.title,
            reporter_name=t.reporter.full_name if t.reporter else "Unknown",
            reporter_role=t.reporter.role.name if t.reporter and t.reporter.role else "reporter",
            reporter={"id": t.reporter.id, "full_name": t.reporter.full_name} if t.reporter else None,
            department_id=t.department_id,
            department_name=dept_name,
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
            is_overdue=is_ticket_overdue(t)
        )
        for t in recent_dept_tickets
    ]

    return DepartmentAnalyticsResponse(
        department_id=department_id,
        department_name=dept_name,
        kpis=kpis,
        status_distribution=status_distribution,
        category_breakdown=category_breakdown,
        priority_distribution=priority_distribution,
        trends=trends,
        avg_resolution_hours=avg_resolution_hours,
        recent_tickets=recent_tickets,
        # Frontend root-level aliases
        total_tickets=total_received,
        new_tickets=status_counts.get(TicketStatusEnum.NEW.value, 0),
        in_progress_tickets=in_progress_count,
        resolved_tickets=resolved_count,
        assigned_tickets=status_counts.get(TicketStatusEnum.ASSIGNED.value, 0),
        waiting_tickets=status_counts.get(TicketStatusEnum.WAITING_FOR_INFO.value, 0),
        overdue_tickets=overdue_count,
        daily_volume=trends,
        overdue_ticket_list=[],
    )

def get_reporter_analytics(db: Session, reporter_id: int) -> ReporterAnalyticsResponse:
    tickets = db.query(Ticket).filter(Ticket.reporter_id == reporter_id).all()
    total_submitted = len(tickets)

    resolved_count = 0
    pending_count = 0
    in_progress_count = 0
    reopened_count = 0

    status_counts: Dict[str, int] = {}
    for t in tickets:
        st = t.status
        status_counts[st] = status_counts.get(st, 0) + 1
        if st in [TicketStatusEnum.RESOLVED.value, TicketStatusEnum.CLOSED.value]:
            resolved_count += 1
        elif st in [TicketStatusEnum.NEW.value, TicketStatusEnum.ASSIGNED.value, TicketStatusEnum.WAITING_FOR_INFO.value]:
            pending_count += 1
        elif st == TicketStatusEnum.IN_PROGRESS.value:
            in_progress_count += 1
        elif st == TicketStatusEnum.REOPENED.value:
            reopened_count += 1

    kpis = KPICardData(
        total_tickets=total_submitted,
        resolved_tickets=resolved_count,
        pending_tickets=pending_count,
        in_progress_tickets=in_progress_count,
        unresolved_tickets=status_counts.get(TicketStatusEnum.ON_HOLD.value, 0),
        overdue_tickets=0,
        avg_resolution_hours=0.0
    )

    status_distribution = [
        ChartItem(name=k, value=v)
        for k, v in status_counts.items()
    ]

    recent_query = (
        db.query(Ticket)
        .filter(Ticket.reporter_id == reporter_id)
        .order_by(Ticket.created_at.desc())
        .limit(10)
        .all()
    )
    recent_tickets = [
        TicketListItem(
            id=t.id,
            ticket_number=t.ticket_number,
            title=t.title,
            reporter_name=t.reporter.full_name if t.reporter else "You",
            reporter_role=t.reporter.role.name if t.reporter and t.reporter.role else "reporter",
            reporter={"id": t.reporter.id, "full_name": t.reporter.full_name} if t.reporter else None,
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
            is_overdue=is_ticket_overdue(t)
        )
        for t in recent_query
    ]

    return ReporterAnalyticsResponse(
        kpis=kpis,
        status_distribution=status_distribution,
        recent_tickets=recent_tickets,
        summary={
            "total": total_submitted,
            "new": status_counts.get(TicketStatusEnum.NEW.value, 0),
            "assigned": status_counts.get(TicketStatusEnum.ASSIGNED.value, 0),
            "in_progress": status_counts.get(TicketStatusEnum.IN_PROGRESS.value, 0),
            "waiting_for_info": status_counts.get(TicketStatusEnum.WAITING_FOR_INFO.value, 0),
            "on_hold": status_counts.get(TicketStatusEnum.ON_HOLD.value, 0),
            "resolved": status_counts.get(TicketStatusEnum.RESOLVED.value, 0),
            "closed": status_counts.get(TicketStatusEnum.CLOSED.value, 0),
            "reopened": status_counts.get(TicketStatusEnum.REOPENED.value, 0),
        }
    )
