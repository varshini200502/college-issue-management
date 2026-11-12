import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.main import app
from app.models.models import (
    Role, Department, Category, Subcategory, User, Ticket,
    TicketJustification, TicketStatusEnum, PriorityEnum
)

# Test Database setup (using SQLite for rapid, isolated, zero-dependency unit tests)
TEST_DB_URL = "sqlite:///./test_college.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_data():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()

    # 1. Roles
    r_rep = Role(name="reporter", description="Reporter")
    r_adm = Role(name="department_admin", description="Dept Admin")
    r_pri = Role(name="principal", description="Principal")
    db.add_all([r_rep, r_adm, r_pri])
    db.commit()

    # 2. Departments
    d_it = Department(name="IT Administration", code="IT", description="IT Services", is_active=True)
    d_fin = Department(name="Finance", code="FIN", description="Finance Services", is_active=True)
    d_infra = Department(name="Infrastructure and Maintenance", code="INFRA", description="Infra Services", is_active=True)
    db.add_all([d_it, d_fin, d_infra])
    db.commit()

    # 3. Categories
    c_wifi = Category(name="Wi-Fi / Internet", department_id=d_it.id, is_active=True)
    c_fee = Category(name="Fee Payment", department_id=d_fin.id, is_active=True)
    c_elec = Category(name="Electrical Issues", department_id=d_infra.id, is_active=True)
    db.add_all([c_wifi, c_fee, c_elec])
    db.commit()

    # 4. Users
    u_alex = User(
        email="alex@college.edu",
        full_name="Alex Student",
        hashed_password=get_password_hash("Student@123"),
        role_id=r_rep.id,
        reporter_type="student",
        is_active=True
    )
    u_other = User(
        email="other@college.edu",
        full_name="Other Student",
        hashed_password=get_password_hash("Student@123"),
        role_id=r_rep.id,
        reporter_type="student",
        is_active=True
    )
    u_it = User(
        email="it.admin@college.edu",
        full_name="IT Admin",
        hashed_password=get_password_hash("Admin@123"),
        role_id=r_adm.id,
        department_id=d_it.id,
        is_active=True
    )
    u_fin = User(
        email="fin.admin@college.edu",
        full_name="Finance Admin",
        hashed_password=get_password_hash("Admin@123"),
        role_id=r_adm.id,
        department_id=d_fin.id,
        is_active=True
    )
    u_pri = User(
        email="principal@college.edu",
        full_name="Principal Supervisor",
        hashed_password=get_password_hash("Admin@123"),
        role_id=r_pri.id,
        is_active=True
    )
    db.add_all([u_alex, u_other, u_it, u_fin, u_pri])
    db.commit()

    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

client = TestClient(app)

def get_auth_token(email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]

def test_login_flow():
    # Valid login
    token = get_auth_token("alex@college.edu", "Student@123")
    assert token is not None

    # Invalid login
    resp = client.post("/api/auth/login", json={"email": "alex@college.edu", "password": "WrongPassword"})
    assert resp.status_code == 401

def test_student_raises_it_issue_and_auto_routes():
    token = get_auth_token("alex@college.edu", "Student@123")
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch Wi-Fi category ID
    cat_resp = client.get("/api/categories")
    assert cat_resp.status_code == 200
    wifi_cat = next(c for c in cat_resp.json() if c["name"] == "Wi-Fi / Internet")

    ticket_data = {
        "title": "Wi-Fi in Library 3rd Floor keeps dropping connection",
        "description": "Signal strength shows 1 bar and disconnects every 5 minutes during research.",
        "category_id": wifi_cat["id"],
        "priority": "HIGH"
    }

    create_resp = client.post("/api/tickets", json=ticket_data, headers=headers)
    assert create_resp.status_code == 201, create_resp.text
    ticket = create_resp.json()

    # 1. Unique ticket ID generated (COL-YYYY-XXXX)
    assert ticket["ticket_number"].startswith(f"COL-{datetime.now(timezone.utc).year}-")
    # 2. Automatic routing to IT department based on database mapping
    assert ticket["department"]["code"] == "IT"
    assert ticket["status"] == "NEW"
    assert ticket["reporter"]["email"] == "alex@college.edu"

    return ticket["id"]

def test_it_admin_views_and_updates_status():
    alex_token = get_auth_token("alex@college.edu", "Student@123")
    it_token = get_auth_token("it.admin@college.edu", "Admin@123")

    # Fetch Wi-Fi category and create ticket
    cat_resp = client.get("/api/categories")
    wifi_cat = next(c for c in cat_resp.json() if c["name"] == "Wi-Fi / Internet")

    create_resp = client.post(
        "/api/tickets",
        json={"title": "Lab 1 router reset required", "description": "No internet on machines 1-10", "category_id": wifi_cat["id"], "priority": "CRITICAL"},
        headers={"Authorization": f"Bearer {alex_token}"}
    )
    t_id = create_resp.json()["id"]

    # IT Admin views the ticket
    detail_resp = client.get(f"/api/tickets/{t_id}", headers={"Authorization": f"Bearer {it_token}"})
    assert detail_resp.status_code == 200

    # IT Admin updates status to IN_PROGRESS
    update_resp = client.patch(
        f"/api/tickets/{t_id}/status",
        json={"status": "IN_PROGRESS", "note": "Technician dispatched to server rack."},
        headers={"Authorization": f"Bearer {it_token}"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "IN_PROGRESS"

    # Student sees updated status in timeline
    student_check = client.get(f"/api/tickets/{t_id}", headers={"Authorization": f"Bearer {alex_token}"})
    assert student_check.status_code == 200
    assert student_check.json()["status"] == "IN_PROGRESS"
    assert len(student_check.json()["status_history"]) >= 2

def test_resolution_requires_description():
    alex_token = get_auth_token("alex@college.edu", "Student@123")
    it_token = get_auth_token("it.admin@college.edu", "Admin@123")

    cat_resp = client.get("/api/categories")
    wifi_cat = next(c for c in cat_resp.json() if c["name"] == "Wi-Fi / Internet")

    create_resp = client.post(
        "/api/tickets",
        json={"title": "Printer driver configuration", "description": "Need network printer installed on lab machine", "category_id": wifi_cat["id"]},
        headers={"Authorization": f"Bearer {alex_token}"}
    )
    t_id = create_resp.json()["id"]

    # Attempt to resolve with empty resolution notes -> MUST FAIL
    fail_resolve = client.post(
        f"/api/tickets/{t_id}/resolve",
        json={"resolution_notes": ""},
        headers={"Authorization": f"Bearer {it_token}"}
    )
    assert fail_resolve.status_code == 422 or fail_resolve.status_code == 400

    # Valid resolution description -> MUST SUCCEED
    valid_resolve = client.post(
        f"/api/tickets/{t_id}/resolve",
        json={"resolution_notes": "Installed HP universal print driver and configured static IP port."},
        headers={"Authorization": f"Bearer {it_token}"}
    )
    assert valid_resolve.status_code == 200
    assert valid_resolve.json()["status"] == "RESOLVED"
    assert valid_resolve.json()["resolution_notes"] is not None

def test_department_isolation_rbac():
    alex_token = get_auth_token("alex@college.edu", "Student@123")
    fin_token = get_auth_token("fin.admin@college.edu", "Admin@123")

    # Create IT ticket
    cat_resp = client.get("/api/categories")
    wifi_cat = next(c for c in cat_resp.json() if c["name"] == "Wi-Fi / Internet")
    create_resp = client.post(
        "/api/tickets",
        json={"title": "Server outage in server room", "description": "Core switch died", "category_id": wifi_cat["id"]},
        headers={"Authorization": f"Bearer {alex_token}"}
    )
    it_t_id = create_resp.json()["id"]

    # Finance Admin attempts to view IT ticket -> MUST BE FORBIDDEN (403)
    fin_view = client.get(f"/api/tickets/{it_t_id}", headers={"Authorization": f"Bearer {fin_token}"})
    assert fin_view.status_code == 403

    # Finance Admin attempts to modify IT ticket -> MUST BE FORBIDDEN (403)
    fin_patch = client.patch(
        f"/api/tickets/{it_t_id}/status",
        json={"status": "IN_PROGRESS"},
        headers={"Authorization": f"Bearer {fin_token}"}
    )
    assert fin_patch.status_code == 403

def test_unresolved_justification_workflow():
    alex_token = get_auth_token("alex@college.edu", "Student@123")
    it_token = get_auth_token("it.admin@college.edu", "Admin@123")
    pri_token = get_auth_token("principal@college.edu", "Admin@123")

    cat_resp = client.get("/api/categories")
    wifi_cat = next(c for c in cat_resp.json() if c["name"] == "Wi-Fi / Internet")
    create_resp = client.post(
        "/api/tickets",
        json={"title": "Underground fiber cable snapped during construction", "description": "Campus ring network severed near north gate", "category_id": wifi_cat["id"]},
        headers={"Authorization": f"Bearer {alex_token}"}
    )
    t_id = create_resp.json()["id"]

    # IT Admin submits mandatory 5-point formal justification
    just_data = {
        "reason_code": "External vendor dependency",
        "explanation": "The armored 24-core fiber optic cable was cut by a municipal trench excavator. Splicing requires specialized fusion equipment from the optical vendor.",
        "actions_attempted": "Campus IT verified line continuity using OTDR and located fault at 420 meters from node.",
        "challenges_encountered": "Vendor splicing team is based in metro center with a 48-hour emergency response window.",
        "external_support_required": True,
        "next_proposed_action": "Vendor technicians scheduled for 9:00 AM tomorrow; traffic routed via backup wireless bridge."
    }
    just_resp = client.post(f"/api/tickets/{t_id}/justification", json=just_data, headers={"Authorization": f"Bearer {it_token}"})
    assert just_resp.status_code == 200
    assert just_resp.json()["reason_code"] == "External vendor dependency"

    # Verify ticket is placed on ON_HOLD with justification
    ticket_check = client.get(f"/api/tickets/{t_id}", headers={"Authorization": f"Bearer {it_token}"})
    assert ticket_check.json()["status"] == "ON_HOLD"
    assert ticket_check.json()["justification"] is not None

    # Principal can view the justification in supervisor view
    pri_check = client.get(f"/api/tickets/{t_id}", headers={"Authorization": f"Bearer {pri_token}"})
    assert pri_check.status_code == 200
    assert pri_check.json()["justification"]["explanation"].startswith("The armored 24-core")

def test_principal_strictly_read_only_mutation_blocked():
    pri_token = get_auth_token("principal@college.edu", "Admin@123")
    pri_headers = {"Authorization": f"Bearer {pri_token}"}

    # 1. Principal attempts to CREATE a ticket -> MUST BE FORBIDDEN (403)
    cat_resp = client.get("/api/categories")
    cat_id = cat_resp.json()[0]["id"]
    create_try = client.post("/api/tickets", json={"title": "Test", "description": "Test description here", "category_id": cat_id}, headers=pri_headers)
    assert create_try.status_code == 403
    assert "Principal role is strictly supervisor read-only" in create_try.json()["detail"] or "reporters" in create_try.json()["detail"]

    # 2. Principal attempts to UPDATE status -> MUST BE FORBIDDEN (403)
    status_try = client.patch("/api/tickets/1/status", json={"status": "RESOLVED"}, headers=pri_headers)
    assert status_try.status_code == 403

    # 3. Principal attempts to RESOLVE ticket -> MUST BE FORBIDDEN (403)
    resolve_try = client.post("/api/tickets/1/resolve", json={"resolution_notes": "Resolved by Principal"}, headers=pri_headers)
    assert resolve_try.status_code == 403

    # 4. Principal attempts to submit JUSTIFICATION -> MUST BE FORBIDDEN (403)
    just_try = client.post(
        "/api/tickets/1/justification",
        json={"reason_code": "Other", "explanation": "Test explanation text here", "actions_attempted": "Attempted text", "challenges_encountered": "Roadblocks met"},
        headers=pri_headers
    )
    assert just_try.status_code == 403

    # 5. Principal CAN view college-wide analytics and all tickets
    analytics_resp = client.get("/api/analytics/principal", headers=pri_headers)
    assert analytics_resp.status_code == 200
    data = analytics_resp.json()
    assert "kpis" in data
    assert "resolution_overview" in data
    assert "issues_by_department" in data
    assert "issue_trends" in data
    assert "most_reported_categories" in data
    assert "department_status_stacked" in data
    assert "avg_resolution_time_by_dept" in data
    assert "priority_distribution" in data

def test_csv_export_respects_rbac():
    alex_token = get_auth_token("alex@college.edu", "Student@123")
    pri_token = get_auth_token("principal@college.edu", "Admin@123")

    # Reporter export
    alex_export = client.get("/api/reports/export", headers={"Authorization": f"Bearer {alex_token}"})
    assert alex_export.status_code == 200
    assert "Ticket ID,Title,Description" in alex_export.text

    # Principal export
    pri_export = client.get("/api/reports/export", headers={"Authorization": f"Bearer {pri_token}"})
    assert pri_export.status_code == 200
    assert "Ticket ID,Title,Description" in pri_export.text
