from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

# --- Auth & Token ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
    department_id: Optional[int] = None

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)

# --- Role & Department ---
class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Categories & Subcategories ---
class SubcategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class SubcategoryResponse(SubcategoryBase):
    id: int
    category_id: int

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    code: Optional[str] = None
    department_id: int
    description: Optional[str] = None
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    department_name: Optional[str] = None
    subcategories: List[SubcategoryResponse] = []

    class Config:
        from_attributes = True

# --- User ---
class UserBase(BaseModel):
    email: str = Field(..., min_length=3)
    full_name: str
    phone: Optional[str] = None
    reporter_type: Optional[str] = None # student, faculty, staff

class UserCreate(UserBase):
    password: str
    role_name: str = "reporter"
    department_id: Optional[int] = None

class UserSimple(BaseModel):
    id: int
    email: str
    full_name: str
    role_name: str
    reporter_type: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True

class UserResponse(UserBase):
    id: int
    role: RoleResponse
    department: Optional[DepartmentResponse] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Ticket Comment ---
class CommentCreate(BaseModel):
    comment_text: str = Field(..., min_length=1)
    is_info_request: bool = False
    is_internal: bool = False

class CommentResponse(BaseModel):
    id: int
    ticket_id: int
    user_id: int
    author_name: str
    author_role: str
    comment_text: str
    is_info_request: bool
    is_internal: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Ticket Status History ---
class StatusHistoryResponse(BaseModel):
    id: int
    ticket_id: int
    changed_by_name: str
    changed_by_role: str
    from_status: Optional[str] = None
    to_status: str
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Ticket Justification ---
class JustificationCreate(BaseModel):
    reason_code: str = Field(..., min_length=2, description="Categorized reason for unresolved status")
    explanation: str = Field(..., min_length=15, description="Mandatory detailed written explanation")
    actions_attempted: str = Field(..., min_length=10, description="What steps were tried")
    challenges_encountered: str = Field(..., min_length=10, description="What roadblocks were met")
    external_support_required: bool = False
    next_proposed_action: Optional[str] = None

class JustificationResponse(BaseModel):
    id: int
    ticket_id: int
    admin_id: int
    admin_name: str
    reason_code: str
    explanation: str
    actions_attempted: str
    challenges_encountered: str
    external_support_required: bool
    next_proposed_action: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Ticket Attachment ---
class AttachmentResponse(BaseModel):
    id: int
    ticket_id: int
    filename: str
    original_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Ticket ---
class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    category_id: int
    subcategory_id: Optional[int] = None
    priority: str = Field("MEDIUM", description="LOW | MEDIUM | HIGH | CRITICAL")
    confirm_duplicate: bool = False

class TicketStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status")
    note: Optional[str] = None
    hold_reason: Optional[str] = None

class TicketAssignUpdate(BaseModel):
    assigned_to_id: int
    note: Optional[str] = None

class TicketResolveRequest(BaseModel):
    resolution_notes: str = Field(..., min_length=10, description="Mandatory resolution description")

class TicketReopenRequest(BaseModel):
    note: str = Field(..., min_length=10, description="Reason for reopening issue")

class TicketResponse(BaseModel):
    id: int
    ticket_number: str
    title: str
    description: str
    reporter_id: int
    reporter: UserSimple
    department_id: int
    department: DepartmentResponse
    department_name: Optional[str] = None
    category_id: int
    category_name: str
    category: Optional[dict] = None
    subcategory_id: Optional[int] = None
    subcategory_name: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to: Optional[UserSimple] = None
    priority: str
    status: str
    resolution_notes: Optional[str] = None
    hold_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    is_overdue: bool = False
    comments: List[CommentResponse] = []
    status_history: List[StatusHistoryResponse] = []
    justification: Optional[JustificationResponse] = None
    attachments: List[AttachmentResponse] = []

    class Config:
        from_attributes = True

class TicketListItem(BaseModel):
    id: int
    ticket_number: str
    title: str
    reporter_name: str
    reporter_role: Optional[str] = None
    reporter: Optional[dict] = None
    department_id: Optional[int] = None
    department_name: str
    department: Optional[dict] = None
    category_id: Optional[int] = None
    category_name: str
    category: Optional[dict] = None
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    has_justification: bool = False
    justification: Optional[dict] = None
    is_overdue: bool = False

    class Config:
        from_attributes = True

class TicketListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[TicketListItem]

class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    existing_ticket: Optional[TicketListItem] = None
    message: Optional[str] = None

# --- Notifications ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    ticket_id: Optional[int] = None
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Analytics ---
class KPICardData(BaseModel):
    total_tickets: int = 0
    resolved_tickets: int = 0
    pending_tickets: int = 0
    in_progress_tickets: int = 0
    unresolved_tickets: int = 0
    overdue_tickets: int = 0
    avg_resolution_hours: float = 0.0

    # Frontend aliases
    total: Optional[int] = None
    resolved: Optional[int] = None
    pending: Optional[int] = None
    in_progress: Optional[int] = None
    unresolved: Optional[int] = None
    overdue: Optional[int] = None
    unresolved_justified: Optional[int] = None

class ChartItem(BaseModel):
    name: str
    value: int
    color: Optional[str] = None
    status: Optional[str] = None
    count: Optional[int] = None

class DepartmentIssueCount(BaseModel):
    department: str
    total: int = 0
    resolved: int = 0
    pending: int = 0
    in_progress: int = 0
    unresolved: int = 0

class TrendItem(BaseModel):
    date: str
    count: int = 0
    resolved: int = 0

class CategoryReportItem(BaseModel):
    category: str
    department: str
    count: int

class ResolutionTimeItem(BaseModel):
    department: str
    avg_hours: float

class PrincipalAnalyticsResponse(BaseModel):
    kpis: KPICardData
    resolution_overview: List[ChartItem]
    issues_by_department: List[DepartmentIssueCount]
    issue_trends: List[TrendItem]
    most_reported_categories: List[CategoryReportItem]
    department_status_stacked: List[DepartmentIssueCount]
    avg_resolution_time_by_dept: List[ResolutionTimeItem]
    priority_distribution: List[ChartItem]
    recent_tickets: List[TicketListItem]
    highest_pending_departments: List[ChartItem]
    overdue_tickets: List[TicketListItem]
    unresolved_justifications_summary: List[Any]

    # Frontend Aliases
    donut_data: Optional[List[ChartItem]] = None
    dept_bar: Optional[List[DepartmentIssueCount]] = None
    trends: Optional[List[TrendItem]] = None
    categories_bar: Optional[List[CategoryReportItem]] = None
    dept_stacked: Optional[List[DepartmentIssueCount]] = None
    resolution_time: Optional[List[ResolutionTimeItem]] = None
    priority_dist: Optional[List[ChartItem]] = None

class DepartmentAnalyticsResponse(BaseModel):
    department_id: int
    department_name: str
    kpis: KPICardData
    status_distribution: Any
    category_breakdown: List[ChartItem]
    priority_distribution: List[ChartItem]
    trends: List[TrendItem]
    avg_resolution_hours: float
    recent_tickets: List[TicketListItem]

    # Frontend root-level aliases
    total_tickets: Optional[int] = None
    new_tickets: Optional[int] = None
    in_progress_tickets: Optional[int] = None
    resolved_tickets: Optional[int] = None
    assigned_tickets: Optional[int] = None
    waiting_tickets: Optional[int] = None
    overdue_tickets: Optional[int] = None
    daily_volume: Optional[List[TrendItem]] = None
    overdue_ticket_list: Optional[List[TicketListItem]] = None

class ReporterAnalyticsResponse(BaseModel):
    kpis: KPICardData
    status_distribution: List[ChartItem]
    recent_tickets: List[TicketListItem]
    summary: Optional[Dict[str, int]] = None
    trends: Optional[List[TrendItem]] = None
