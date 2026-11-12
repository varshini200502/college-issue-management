from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.models import Category, Subcategory, Department
from app.schemas.schemas import CategoryResponse, CategoryCreate, SubcategoryResponse, SubcategoryBase

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
def get_categories(department_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    List categories and subcategories with their responsible department mapping.
    This database-driven mapping powers the automatic routing engine.
    """
    query = db.query(Category).filter(Category.is_active == True)
    if department_id:
        query = query.filter(Category.department_id == department_id)
    categories = query.order_by(Category.name.asc()).all()

    results = []
    for c in categories:
        sub_list = [
            SubcategoryResponse(
                id=s.id,
                category_id=s.category_id,
                name=s.name,
                description=s.description,
                is_active=s.is_active
            )
            for s in c.subcategories if s.is_active
        ]
        results.append(
            CategoryResponse(
                id=c.id,
                name=c.name,
                code=c.code,
                department_id=c.department_id,
                description=c.description,
                is_active=c.is_active,
                created_at=c.created_at,
                department_name=c.department.name if c.department else None,
                subcategories=sub_list
            )
        )
    return results

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    current_user = Depends(require_roles(["department_admin"])),
    db: Session = Depends(get_db)
):
    dept = db.query(Department).filter(Department.id == cat_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department does not exist")

    cat = Category(
        name=cat_in.name.strip(),
        code=cat_in.code,
        department_id=cat_in.department_id,
        description=cat_in.description,
        is_active=cat_in.is_active
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)

    return CategoryResponse(
        id=cat.id,
        name=cat.name,
        code=cat.code,
        department_id=cat.department_id,
        description=cat.description,
        is_active=cat.is_active,
        created_at=cat.created_at,
        department_name=dept.name,
        subcategories=[]
    )

@router.post("/{category_id}/subcategories", response_model=SubcategoryResponse, status_code=status.HTTP_201_CREATED)
def add_subcategory(
    category_id: int,
    sub_in: SubcategoryBase,
    current_user = Depends(require_roles(["department_admin"])),
    db: Session = Depends(get_db)
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    sub = Subcategory(
        category_id=category_id,
        name=sub_in.name.strip(),
        description=sub_in.description,
        is_active=sub_in.is_active
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub
