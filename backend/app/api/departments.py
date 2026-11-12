from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.models import Department
from app.schemas.schemas import DepartmentResponse, DepartmentCreate

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    """List all active departments in the college."""
    departments = db.query(Department).filter(Department.is_active == True).order_by(Department.name.asc()).all()
    return departments

@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(department_id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return dept

@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreate,
    current_user = Depends(require_roles(["department_admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(Department).filter(Department.code == dept_in.code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department code already exists")

    dept = Department(
        name=dept_in.name.strip(),
        code=dept_in.code.upper().strip(),
        description=dept_in.description,
        is_active=dept_in.is_active
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept
