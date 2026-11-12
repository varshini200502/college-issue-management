import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, require_department_admin, require_principal
from app.models.models import User, Role, Department
from app.schemas.schemas import (
    UserSimple, UserResponse, UserManagementCreate, UserManagementResponse,
    UserListResponse, PasswordResetRequest
)

router = APIRouter(prefix="/users", tags=["Users"])


# ─── Department Admin ─────────────────────────────────────────────────────────

@router.get("/department-members", response_model=List[UserSimple])
def get_department_members(
    current_user: User = Depends(require_department_admin),
    db: Session = Depends(get_db),
):
    """List active staff / team members in the dept admin's department (for assignment)."""
    members = (
        db.query(User)
        .filter(User.department_id == current_user.department_id, User.is_active == True)
        .all()
    )
    return [
        UserSimple(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role_name=u.role.name if u.role else "department_admin",
            reporter_type=u.reporter_type,
            department_id=u.department_id,
            department_name=u.department.name if u.department else None,
        )
        for u in members
    ]


# ─── Principal: User Management ───────────────────────────────────────────────

@router.get("", response_model=UserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[str] = Query(None, description="Filter by role name"),
    department_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    is_demo: Optional[bool] = Query(None),
    current_user: User = Depends(require_principal),
    db: Session = Depends(get_db),
):
    """Principal only: list all users with optional filters."""
    q = db.query(User)
    if search:
        like = f"%{search}%"
        q = q.filter((User.full_name.ilike(like)) | (User.email.ilike(like)))
    if role:
        q = q.join(Role).filter(Role.name == role)
    if department_id is not None:
        q = q.filter(User.department_id == department_id)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    if is_demo is not None:
        q = q.filter(User.is_demo == is_demo)

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if total else 1

    return UserListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=users,
    )


@router.post("", response_model=UserManagementResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserManagementCreate,
    current_user: User = Depends(require_principal),
    db: Session = Depends(get_db),
):
    """Principal only: create any user (reporter / department_admin / principal)."""
    # Validate role
    allowed_roles = ["reporter", "department_admin", "principal"]
    if user_in.role_name not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"role_name must be one of {allowed_roles}",
        )

    # Check duplicate email
    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Resolve role
    role = db.query(Role).filter(Role.name == user_in.role_name).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role '{user_in.role_name}' not found in database.")

    # Validate department for dept_admin
    if user_in.role_name == "department_admin":
        if not user_in.department_id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="department_id is required for department_admin role.")
        dept = db.query(Department).filter(Department.id == user_in.department_id).first()
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found.")

    new_user = User(
        email=user_in.email.lower().strip(),
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role_id=role.id,
        reporter_type=user_in.reporter_type,
        department_id=user_in.department_id,
        phone=user_in.phone,
        is_active=True,
        is_demo=user_in.is_demo,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/{user_id}/activate", response_model=UserManagementResponse)
def activate_user(
    user_id: int,
    current_user: User = Depends(require_principal),
    db: Session = Depends(get_db),
):
    """Principal only: activate a deactivated user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/deactivate", response_model=UserManagementResponse)
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_principal),
    db: Session = Depends(get_db),
):
    """Principal only: deactivate a user account (soft delete)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account.")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password", status_code=200)
def reset_user_password(
    user_id: int,
    req: PasswordResetRequest,
    current_user: User = Depends(require_principal),
    db: Session = Depends(get_db),
):
    """Principal only: forcibly reset any user's password (no current_password required)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": f"Password for {user.email} has been reset successfully."}


@router.get("/{user_id}", response_model=UserManagementResponse)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user by ID. Principal can view any user; others can only view themselves."""
    role_name = current_user.role.name if current_user.role else ""
    if role_name != "principal" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user
