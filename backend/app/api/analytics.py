from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user, require_principal, require_department_admin
)
from app.models.models import User, Department
from app.schemas.schemas import (
    PrincipalAnalyticsResponse, DepartmentAnalyticsResponse, ReporterAnalyticsResponse
)
from app.services.analytics_service import (
    get_principal_analytics, get_department_analytics, get_reporter_analytics
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/principal", response_model=PrincipalAnalyticsResponse)
def principal_analytics(
    department_id: Optional[int] = None,
    category_id: Optional[int] = None,
    priority: Optional[str] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_principal),
    db: Session = Depends(get_db)
):
    """
    Centralized College-wide Analytics for the Principal.
    Provides live real-time aggregations from PostgreSQL:
    - 6 KPI cards
    - 7 Visualizations (Recharts compliant)
    - Performance comparison and SLA metrics
    """
    return get_principal_analytics(
        db=db,
        department_id=department_id,
        category_id=category_id,
        priority=priority,
        status_filter=status_filter,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/department", response_model=DepartmentAnalyticsResponse)
def department_analytics(
    department_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Department-specific analytics.
    Department Admins can only view their own department.
    Principal can view any department.
    """
    role_name = current_user.role.name if current_user.role else ""

    target_dept_id = None
    if role_name == "department_admin":
        target_dept_id = current_user.department_id
    elif role_name == "principal":
        target_dept_id = department_id or 1
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Only department administrators and the Principal can access department analytics."
        )

    if not target_dept_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid department ID is required."
        )

    return get_department_analytics(db=db, department_id=target_dept_id)

@router.get("/reporter", response_model=ReporterAnalyticsResponse)
def reporter_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reporter personal summary and status breakdown.
    """
    return get_reporter_analytics(db=db, reporter_id=current_user.id)
