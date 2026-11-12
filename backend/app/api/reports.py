from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import User
from app.services.export_service import export_tickets_to_csv

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/export")
def export_tickets_csv(
    department_id: Optional[int] = None,
    category_id: Optional[int] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export tickets report to CSV.
    Enforces RBAC data boundaries:
    - Reporter: only own tickets.
    - Department Admin: only own department's tickets.
    - Principal: college-wide tickets, filtered as desired.
    """
    csv_content = export_tickets_to_csv(
        db=db,
        current_user=current_user,
        department_id=department_id,
        category_id=category_id,
        priority=priority,
        status_filter=status,
        start_date=start_date,
        end_date=end_date
    )

    filename = f"college_tickets_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
