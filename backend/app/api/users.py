from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_department_admin
from app.models.models import User, Role, Department
from app.schemas.schemas import UserSimple, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/department-members", response_model=List[UserSimple])
def get_department_members(
    current_user: User = Depends(require_department_admin),
    db: Session = Depends(get_db)
):
    """List staff / team members in the admin's department for assignment."""
    members = (
        db.query(User)
        .filter(User.department_id == current_user.department_id, User.is_active == True)
        .all()
    )
    results = [
        UserSimple(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role_name=u.role.name if u.role else "department_admin",
            reporter_type=u.reporter_type,
            department_id=u.department_id,
            department_name=u.department.name if u.department else None
        )
        for u in members
    ]
    return results

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
