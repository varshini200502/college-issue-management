from typing import List
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import oauth2_scheme, decode_token
from app.models.models import User, Role

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return user

def require_roles(allowed_roles: List[str]):
    def role_dependency(current_user: User = Depends(get_current_user)):
        role_name = current_user.role.name if current_user.role else ""
        if role_name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User role '{role_name}' does not have sufficient privileges. Allowed: {allowed_roles}",
            )
        return current_user
    return role_dependency

def require_reporter(current_user: User = Depends(get_current_user)):
    role_name = current_user.role.name if current_user.role else ""
    if role_name != "reporter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Only reporters (students, faculty, staff) can perform this action.",
        )
    return current_user

def require_department_admin(current_user: User = Depends(get_current_user)):
    role_name = current_user.role.name if current_user.role else ""
    if role_name != "department_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Only department administrators can perform this action.",
        )
    if not current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department administrator is not assigned to any department.",
        )
    return current_user

def require_principal(current_user: User = Depends(get_current_user)):
    role_name = current_user.role.name if current_user.role else ""
    if role_name != "principal":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Only the Principal can access college-wide supervisor views.",
        )
    return current_user

def block_principal_mutation(current_user: User = Depends(get_current_user)):
    """
    Enforces backend restriction:
    The Principal is a read-only supervisor and must never mutate ticket states,
    assign, route, reassign, update, resolve, or close tickets.
    """
    role_name = current_user.role.name if current_user.role else ""
    if role_name == "principal":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Principal role is strictly supervisor read-only: Cannot create, assign, update, resolve, route, or close tickets.",
        )
    return current_user
