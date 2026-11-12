import os
from datetime import datetime, timezone, timedelta
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.models import (
    Role, Department, Category, Subcategory, User, Ticket,
    TicketComment, TicketStatusHistory, TicketJustification,
    PriorityEnum, TicketStatusEnum, JustificationReasonEnum
)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("[*] Starting database seeding...")

    # 1. Create Roles
    role_names = [
        ("reporter", "Student, Faculty, or Staff submitting tickets"),
        ("department_admin", "Department Administrator managing department tickets"),
        ("principal", "College-wide supervisor with read-only executive dashboards")
    ]
    roles = {}
    for name, desc in role_names:
        r = db.query(Role).filter(Role.name == name).first()
        if not r:
            r = Role(name=name, description=desc)
            db.add(r)
            db.commit()
            db.refresh(r)
        roles[name] = r
    print(f"[*] Roles verified: {list(roles.keys())}")

    # 2. Create Departments
    departments_data = [
        ("IT Administration", "IT", "Campus networking, computers, LMS, Wi-Fi, and software systems"),
        ("Finance", "FIN", "Student fees, receipts, accounts, and financial clearance"),
        ("Human Resources", "HR", "Faculty and staff payroll, benefits, and workplace administration"),
        ("Infrastructure and Maintenance", "INFRA", "Classroom repairs, electricity, air conditioning, plumbing, and civil maintenance"),
        ("Academics", "ACAD", "Course registration, grading records, transcripts, timetable and exam schedules"),
        ("Library", "LIB", "Book lending, digital research subscriptions, and study spaces"),
        ("Hostel", "HOSTEL", "Hostel accommodation, room allotment, maintenance, and dining mess"),
        ("Transport", "TRANS", "College shuttle fleet, commuter buses, and route coordination")
    ]
    departments = {}
    for name, code, desc in departments_data:
        d = db.query(Department).filter(Department.code == code).first()
        if not d:
            d = Department(name=name, code=code, description=desc, is_active=True)
            db.add(d)
            db.commit()
            db.refresh(d)
        departments[code] = d
    print(f"[*] Departments verified: {len(departments)} departments")

    # 3. Create Categories & Subcategories
    categories_data = [
        # IT Administration
        ("Wi-Fi / Internet", "IT", "Wi-Fi connectivity, speed, captive portal and signal coverage", [
            "Campus Wi-Fi Disconnected", "Slow Bandwidth / High Latency", "Captive Portal Login Failure", "Hostel Access Point Down"
        ]),
        ("Computer / Software", "IT", "Lab workstations, OS installation, software licenses and projector audio/video", [
            "Lab Workstation Blue Screen", "Matlab / Python License Expired", "Projector Display HDMI Fault", "Printer Offline"
        ]),
        # Finance
        ("Fee Payment", "FIN", "Online fee gateway errors, double debits, and installment requests", [
            "Online Gateway Transaction Failure", "Bank Debited but Portal Unpaid", "Installment Plan Request"
        ]),
        ("Fee Receipt", "FIN", "Official fee receipts, tax certificates, and clearance slips", [
            "Missing Semester Fee Receipt", "Tax Exemption Form 16 Request", "Scholarship Receipt Adjustment"
        ]),
        # Human Resources
        ("Salary / HR Issues", "HR", "Faculty and staff compensation, payroll discrepancies, and PF", [
            "Monthly Salary Discrepancy", "Provident Fund Slip", "Overtime Allowance Query"
        ]),
        # Infrastructure
        ("Classroom Maintenance", "INFRA", "Desks, whiteboards, podiums, and classroom cleanliness", [
            "Broken Student Desks", "Smart Board Calibration", "Classroom Window Glass Cracked"
        ]),
        ("Electrical Issues", "INFRA", "Power cuts, short circuits, switchboards, and air conditioning", [
            "Air Conditioner Not Cooling", "Switchboard Sparking / Blown Fuse", "Ceiling Fan Regulator Broken"
        ]),
        ("Plumbing & Sanitation", "INFRA", "Water supply, washroom taps, drainage, and water coolers", [
            "Drinking Water Cooler Filter Dirty", "Washroom Tap Leakage", "Drainage Blockage"
        ]),
        # Academics
        ("Academic Records", "ACAD", "Transcripts, grade correction, grade card reissuance, attendance credits", [
            "Transcript Request Urgent", "Attendance Percentage Discrepancy", "Duplicate Grade Card"
        ]),
        # Library
        ("Library Access", "LIB", "RFID card access, book renewal, research journal database login", [
            "IEEE Xplore / ScienceDirect Login Expired", "RFID Turnstile Card Error", "Inter-Library Loan"
        ]),
        # Hostel
        ("Hostel Facilities", "HOSTEL", "Hostel room keys, hot water geysers, pests, and mess hygiene", [
            "Geyser Not Heating Water", "Mess Food Quality Complaint", "Room Door Lock Defective"
        ]),
        # Transport
        ("Transport Issues", "TRANS", "Bus timings, route stoppages, driver conduct, and bus pass renewals", [
            "Route 4 Morning Bus Delay", "Bus Pass RFID Not Scanning", "Request for New Pickup Point"
        ])
    ]

    category_objects = {}
    for cat_name, dept_code, desc, subcats in categories_data:
        dept = departments.get(dept_code)
        if not dept:
            continue
        c = db.query(Category).filter(Category.name == cat_name).first()
        if not c:
            c = Category(name=cat_name, department_id=dept.id, description=desc, is_active=True)
            db.add(c)
            db.commit()
            db.refresh(c)
            for sub_name in subcats:
                s = Subcategory(category_id=c.id, name=sub_name, is_active=True)
                db.add(s)
            db.commit()
        category_objects[cat_name] = c
    print(f"[*] Categories verified: {len(category_objects)} categories")

    # 4. Create Standard Master Users
    # In production, specify strong initial passwords via DEFAULT_ADMIN_PASSWORD and DEFAULT_STUDENT_PASSWORD
    admin_seed_pwd = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123")
    student_seed_pwd = os.getenv("DEFAULT_STUDENT_PASSWORD", "Student@123")
    faculty_seed_pwd = os.getenv("DEFAULT_FACULTY_PASSWORD", "Faculty@123")
    staff_seed_pwd = os.getenv("DEFAULT_STAFF_PASSWORD", "Staff@123")

    default_users = [
        # Principal (College-wide Supervisor)
        {
            "email": "principal@college.edu",
            "full_name": "Dr. Arthur Pendelton",
            "password": admin_seed_pwd,
            "role": "principal",
            "reporter_type": None,
            "dept_code": None,
            "phone": "+1 (555) 010-0001"
        },
        # Department Admins
        {
            "email": "it.admin@college.edu",
            "full_name": "Rajesh Sharma",
            "password": admin_seed_pwd,
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "IT",
            "phone": "+1 (555) 010-0010"
        },
        {
            "email": "finance.admin@college.edu",
            "full_name": "Priya Sundaram",
            "password": admin_seed_pwd,
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "FIN",
            "phone": "+1 (555) 010-0020"
        },
        {
            "email": "infra.admin@college.edu",
            "full_name": "Vikram Singh",
            "password": admin_seed_pwd,
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "INFRA",
            "phone": "+1 (555) 010-0030"
        },
        {
            "email": "academics.admin@college.edu",
            "full_name": "Dr. Meenakshi Iyer",
            "password": admin_seed_pwd,
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "ACAD",
            "phone": "+1 (555) 010-0040"
        },
        {
            "email": "hostel.admin@college.edu",
            "full_name": "Rakesh Verma",
            "password": admin_seed_pwd,
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "HOSTEL",
            "phone": "+1 (555) 010-0050"
        },
        # Reporters
        {
            "email": "student.alex@college.edu",
            "full_name": "Alex Rivera",
            "password": student_seed_pwd,
            "role": "reporter",
            "reporter_type": "student",
            "dept_code": None,
            "phone": "+1 (555) 010-0101"
        },
        {
            "email": "faculty.sarah@college.edu",
            "full_name": "Prof. Sarah Jenkins",
            "password": faculty_seed_pwd,
            "role": "reporter",
            "reporter_type": "faculty",
            "dept_code": None,
            "phone": "+1 (555) 010-0202"
        },
        {
            "email": "staff.david@college.edu",
            "full_name": "David Miller",
            "password": staff_seed_pwd,
            "role": "reporter",
            "reporter_type": "staff",
            "dept_code": None,
            "phone": "+1 (555) 010-0303"
        }
    ]

    created_users = {}
    for udata in default_users:
        u = db.query(User).filter(User.email == udata["email"]).first()
        dept_id = departments[udata["dept_code"]].id if udata["dept_code"] else None
        if not u:
            u = User(
                email=udata["email"],
                full_name=udata["full_name"],
                hashed_password=get_password_hash(udata["password"]),
                role_id=roles[udata["role"]].id,
                reporter_type=udata["reporter_type"],
                department_id=dept_id,
                phone=udata["phone"],
                is_active=True
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        created_users[udata["email"]] = u
    print(f"[*] Verified {len(created_users)} seed users.")

    # 5. Populate Initial Sample Tickets (Only if explicitly enabled via SEED_SAMPLE_TICKETS=true)
    seed_tickets = os.getenv("SEED_SAMPLE_TICKETS", "false").lower() == "true"
    if not seed_tickets:
        print("[*] Skipping sample ticket generation: Database configured for essential master data and login accounts only.")
    else:
        now = datetime.now(timezone.utc)
        alex = created_users["student.alex@college.edu"]
        sarah = created_users["faculty.sarah@college.edu"]
        it_admin = created_users["it.admin@college.edu"]
        fin_admin = created_users["finance.admin@college.edu"]

        wifi_cat = db.query(Category).filter(Category.name == "Wi-Fi / Internet").first()
        fee_cat = db.query(Category).filter(Category.name == "Fee Payment").first()

        # Ticket 1: Exactly ONE IT ticket with status IN_PROGRESS
        t1 = db.query(Ticket).filter(Ticket.ticket_number == "COL-2026-0001").first()
        if not t1:
            t1_created = now - timedelta(days=2)
            t1 = Ticket(
                ticket_number="COL-2026-0001",
                title="Library 2nd Floor High Density Wi-Fi AP Dropping Packets",
                description="During peak study hours (2 PM to 5 PM), the Aruba AP near the reference section experiences 40% packet drops, preventing access to the digital catalog.",
                reporter_id=alex.id,
                category_id=wifi_cat.id,
                department_id=wifi_cat.department_id,
                priority=PriorityEnum.HIGH.value,
                status=TicketStatusEnum.IN_PROGRESS.value,
                created_at=t1_created,
                updated_at=now - timedelta(hours=3)
            )
            db.add(t1)
            db.commit()
            db.refresh(t1)

            # Status history for t1
            db.add(TicketStatusHistory(
                ticket_id=t1.id,
                changed_by_id=alex.id,
                from_status=None,
                to_status=TicketStatusEnum.NEW.value,
                note="Submitted by Alex Rivera and routed to IT Administration.",
                created_at=t1_created
            ))
            db.add(TicketStatusHistory(
                ticket_id=t1.id,
                changed_by_id=it_admin.id,
                from_status=TicketStatusEnum.NEW.value,
                to_status=TicketStatusEnum.IN_PROGRESS.value,
                note="Investigation started by Rajesh Sharma. Inspecting PoE switch port and antenna signal attenuation.",
                created_at=t1_created + timedelta(hours=4)
            ))
            db.add(TicketComment(
                ticket_id=t1.id,
                user_id=it_admin.id,
                comment_text="Field diagnostics in progress: Signal attenuation detected on PoE switch port 18. Testing replacement CAT6 patch lead.",
                is_internal=False,
                is_info_request=False,
                created_at=t1_created + timedelta(hours=5)
            ))
            db.commit()
            print("[*] Sample IT ticket (IN_PROGRESS) seeded: COL-2026-0001")
        else:
            print("[*] Sample IT ticket COL-2026-0001 already exists.")

        # Ticket 2: Exactly ONE Finance ticket with status RESOLVED
        t2 = db.query(Ticket).filter(Ticket.ticket_number == "COL-2026-0002").first()
        if not t2:
            t2_created = now - timedelta(days=4)
            t2_resolved = now - timedelta(days=2)
            t2 = Ticket(
                ticket_number="COL-2026-0002",
                title="Online Semester 4 Tuition Fee Payment Deduction Discrepancy",
                description="Online payment gateway debited $1,250 from student bank account, but college ERP portal showed payment pending and clearance hold.",
                reporter_id=sarah.id,
                category_id=fee_cat.id,
                department_id=fee_cat.department_id,
                priority=PriorityEnum.MEDIUM.value,
                status=TicketStatusEnum.RESOLVED.value,
                resolution_notes="Verified HDFC gateway reconciliation reference #TXN984210. Gateway payment settled successfully. Account credited in college ERP ledger, clearance hold lifted, and official receipt generated.",
                resolved_at=t2_resolved,
                created_at=t2_created,
                updated_at=t2_resolved
            )
            db.add(t2)
            db.commit()
            db.refresh(t2)

            # Status history for t2
            db.add(TicketStatusHistory(
                ticket_id=t2.id,
                changed_by_id=sarah.id,
                from_status=None,
                to_status=TicketStatusEnum.NEW.value,
                note="Submitted and routed to Finance department.",
                created_at=t2_created
            ))
            db.add(TicketStatusHistory(
                ticket_id=t2.id,
                changed_by_id=fin_admin.id,
                from_status=TicketStatusEnum.NEW.value,
                to_status=TicketStatusEnum.IN_PROGRESS.value,
                note="Finance officer Priya Sundaram initiated bank reconciliation with payment gateway merchant desk.",
                created_at=t2_created + timedelta(hours=6)
            ))
            db.add(TicketStatusHistory(
                ticket_id=t2.id,
                changed_by_id=fin_admin.id,
                from_status=TicketStatusEnum.IN_PROGRESS.value,
                to_status=TicketStatusEnum.RESOLVED.value,
                note="Verified HDFC gateway reconciliation reference #TXN984210. Account credited in ERP ledger and clearance receipt issued.",
                created_at=t2_resolved
            ))
            db.add(TicketComment(
                ticket_id=t2.id,
                user_id=fin_admin.id,
                comment_text="Payment settled with merchant ID #HDFC-COL-9842. The financial clearance hold has been lifted and digital fee receipt is now available in your portal.",
                is_internal=False,
                is_info_request=False,
                created_at=t2_resolved
            ))
            db.commit()
            print("[*] Sample Finance ticket (RESOLVED) seeded: COL-2026-0002")
        else:
            print("[*] Sample Finance ticket COL-2026-0002 already exists.")

    db.close()
    print("[✔] Database initialization and seeding complete.")

if __name__ == "__main__":
    seed_database()
