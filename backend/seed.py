import os
from datetime import datetime, timezone, timedelta
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash, verify_password
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

    # 4. Demo passwords — env-var overridable, with secure unique defaults per tier
    demo_passwords = {
        "student":       os.getenv("DEMO_STUDENT_PASSWORD",  "Demo_Student@2026"),
        "faculty":       os.getenv("DEMO_FACULTY_PASSWORD",  "Demo_Faculty@2026"),
        "staff":         os.getenv("DEMO_STAFF_PASSWORD",    "Demo_Staff@2026"),
        "it_admin":      os.getenv("DEMO_IT_PASSWORD",       "Demo_IT@2026"),
        "fin_admin":     os.getenv("DEMO_FIN_PASSWORD",      "Demo_Fin@2026"),
        "hr_admin":      os.getenv("DEMO_HR_PASSWORD",       "Demo_HR@2026"),
        "infra_admin":   os.getenv("DEMO_INFRA_PASSWORD",    "Demo_Infra@2026"),
        "acad_admin":    os.getenv("DEMO_ACAD_PASSWORD",     "Demo_Acad@2026"),
        "lib_admin":     os.getenv("DEMO_LIB_PASSWORD",      "Demo_Lib@2026"),
        "hostel_admin":  os.getenv("DEMO_HOSTEL_PASSWORD",   "Demo_Hostel@2026"),
        "trans_admin":   os.getenv("DEMO_TRANS_PASSWORD",    "Demo_Trans@2026"),
        "principal":     os.getenv("DEMO_PRINCIPAL_PASSWORD","Demo_Principal@2026"),
    }

    # 5. All 12 demo accounts — idempotent (check by email, never overwrite)
    demo_users_data = [
        # Principal
        {
            "email": "principal@college.edu",
            "full_name": "Dr. Arthur Pendelton",
            "password": demo_passwords["principal"],
            "role": "principal",
            "reporter_type": None,
            "dept_code": None,
            "phone": "+1 (555) 010-0001",
            "is_demo": True,
        },
        # Department Admins
        {
            "email": "it.admin@college.edu",
            "full_name": "Rajesh Sharma",
            "password": demo_passwords["it_admin"],
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "IT",
            "phone": "+1 (555) 010-0010",
            "is_demo": True,
        },
        {
            "email": "finance.admin@college.edu",
            "full_name": "Priya Sundaram",
            "password": demo_passwords["fin_admin"],
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "FIN",
            "phone": "+1 (555) 010-0020",
            "is_demo": True,
        },
        {
            "email": "hr.admin@college.edu",
            "full_name": "Anita Desai",
            "password": demo_passwords["hr_admin"],
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "HR",
            "phone": "+1 (555) 010-0025",
            "is_demo": True,
        },
        {
            "email": "infra.admin@college.edu",
            "full_name": "Vikram Singh",
            "password": demo_passwords["infra_admin"],
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "INFRA",
            "phone": "+1 (555) 010-0030",
            "is_demo": True,
        },
        {
            "email": "academics.admin@college.edu",
            "full_name": "Dr. Meenakshi Iyer",
            "password": demo_passwords["acad_admin"],
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "ACAD",
            "phone": "+1 (555) 010-0040",
            "is_demo": True,
        },
        {
            "email": "library.admin@college.edu",
            "full_name": "Suresh Raman",
            "password": demo_passwords["lib_admin"],
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "LIB",
            "phone": "+1 (555) 010-0045",
            "is_demo": True,
        },
        {
            "email": "hostel.admin@college.edu",
            "full_name": "Rakesh Verma",
            "password": demo_passwords["hostel_admin"],
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "HOSTEL",
            "phone": "+1 (555) 010-0050",
            "is_demo": True,
        },
        {
            "email": "transport.admin@college.edu",
            "full_name": "Gopal Krishnan",
            "password": demo_passwords["trans_admin"],
            "role": "department_admin",
            "reporter_type": None,
            "dept_code": "TRANS",
            "phone": "+1 (555) 010-0055",
            "is_demo": True,
        },
        # Reporters
        {
            "email": "student.alex@college.edu",
            "full_name": "Alex Rivera",
            "password": demo_passwords["student"],
            "role": "reporter",
            "reporter_type": "student",
            "dept_code": None,
            "phone": "+1 (555) 010-0101",
            "is_demo": True,
        },
        {
            "email": "faculty.sarah@college.edu",
            "full_name": "Prof. Sarah Jenkins",
            "password": demo_passwords["faculty"],
            "role": "reporter",
            "reporter_type": "faculty",
            "dept_code": None,
            "phone": "+1 (555) 010-0202",
            "is_demo": True,
        },
        {
            "email": "staff.david@college.edu",
            "full_name": "David Miller",
            "password": demo_passwords["staff"],
            "role": "reporter",
            "reporter_type": "staff",
            "dept_code": None,
            "phone": "+1 (555) 010-0303",
            "is_demo": True,
        },
    ]

    created_users = {}
    new_count = 0
    for udata in demo_users_data:
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
                is_active=True,
                is_demo=udata["is_demo"],
            )
            db.add(u)
            db.commit()
            db.refresh(u)
            new_count += 1
        else:
            # Upgrade legacy shared placeholder credentials to unique persona demo credentials
            legacy_defaults = ["Admin@123", "Student@123", "Faculty@123", "Staff@123"]
            if any(verify_password(old_p, u.hashed_password) for old_p in legacy_defaults):
                u.hashed_password = get_password_hash(udata["password"])
            if not u.is_demo:
                u.is_demo = True
            db.commit()
            db.refresh(u)
        created_users[udata["email"]] = u

    print(f"[*] Demo users verified: {len(created_users)} total ({new_count} newly created)")

    # 6. Demo Seed Tickets (only if explicitly enabled via SEED_SAMPLE_TICKETS=true)
    seed_tickets = os.getenv("SEED_SAMPLE_TICKETS", "false").lower() == "true"
    if not seed_tickets:
        print("[*] Skipping sample ticket generation: Set SEED_SAMPLE_TICKETS=true to seed demo tickets.")
    else:
        now = datetime.now(timezone.utc)
        alex  = created_users["student.alex@college.edu"]
        sarah = created_users["faculty.sarah@college.edu"]
        david = created_users["staff.david@college.edu"]
        it_admin  = created_users["it.admin@college.edu"]
        fin_admin = created_users["finance.admin@college.edu"]

        wifi_cat   = db.query(Category).filter(Category.name == "Wi-Fi / Internet").first()
        fee_cat    = db.query(Category).filter(Category.name == "Fee Payment").first()
        acad_cat   = db.query(Category).filter(Category.name == "Academic Records").first()
        infra_cat  = db.query(Category).filter(Category.name == "Electrical Issues").first()
        hostel_cat = db.query(Category).filter(Category.name == "Hostel Facilities").first()

        demo_tickets = [
            {
                "number": "DEMO-2026-0001",
                "title": "Library 2nd Floor Wi-Fi AP Dropping Packets During Peak Hours",
                "description": "During peak study hours (2 PM to 5 PM), the Aruba AP near the reference section experiences 40% packet drops, preventing access to the digital catalog.",
                "reporter": alex,
                "category": wifi_cat,
                "priority": PriorityEnum.HIGH.value,
                "status": TicketStatusEnum.IN_PROGRESS.value,
                "created_offset_days": 2,
                "admin": it_admin,
                "admin_comment": "Field diagnostics in progress: Signal attenuation detected on PoE switch port 18. Testing replacement CAT6 patch lead.",
            },
            {
                "number": "DEMO-2026-0002",
                "title": "Online Semester 4 Fee Payment Deducted but Portal Shows Pending",
                "description": "Online payment gateway debited $1,250 from student bank account, but college ERP portal shows payment pending with clearance hold.",
                "reporter": sarah,
                "category": fee_cat,
                "priority": PriorityEnum.MEDIUM.value,
                "status": TicketStatusEnum.RESOLVED.value,
                "created_offset_days": 5,
                "admin": fin_admin,
                "resolution_notes": "Verified HDFC gateway reconciliation reference #TXN984210. Payment settled, clearance receipt issued.",
                "admin_comment": "Payment settled with merchant ID #HDFC-COL-9842. Clearance hold lifted, digital fee receipt available.",
            },
            {
                "number": "DEMO-2026-0003",
                "title": "Attendance Percentage Incorrectly Calculated for Elective Subject",
                "description": "The student portal shows 68% attendance for the Advanced Algorithms elective, but actual class records confirm 82% physical attendance for this semester.",
                "reporter": alex,
                "category": acad_cat,
                "priority": PriorityEnum.MEDIUM.value,
                "status": TicketStatusEnum.NEW.value,
                "created_offset_days": 1,
                "admin": None,
            },
            {
                "number": "DEMO-2026-0004",
                "title": "Lab Block B Air Conditioner Not Cooling — Exam Preparation Room",
                "description": "The 2-ton AC unit in Lab Block B Room 204, which is designated for exam preparation sessions, has stopped cooling. Temperature inside is 36°C affecting student health.",
                "reporter": david,
                "category": infra_cat,
                "priority": PriorityEnum.CRITICAL.value,
                "status": TicketStatusEnum.ASSIGNED.value,
                "created_offset_days": 3,
                "admin": None,
            },
            {
                "number": "DEMO-2026-0005",
                "title": "Hostel Block C Geyser Not Heating Water — 12 Rooms Affected",
                "description": "The water heating system for Hostel Block C (rooms 301-312) has completely stopped working since Monday morning. Cold showers in winter are causing student health concerns.",
                "reporter": sarah,
                "category": hostel_cat,
                "priority": PriorityEnum.HIGH.value,
                "status": TicketStatusEnum.ON_HOLD.value,
                "created_offset_days": 4,
                "admin": None,
                "hold_reason": "Waiting for replacement heating element from vendor. ETA: 48 hours.",
            },
        ]

        for td in demo_tickets:
            existing = db.query(Ticket).filter(Ticket.ticket_number == td["number"]).first()
            if existing:
                print(f"[*] Demo ticket {td['number']} already exists, skipping.")
                continue

            if not td["category"]:
                print(f"[!] Skipping demo ticket {td['number']}: category not found.")
                continue

            created_at = now - timedelta(days=td["created_offset_days"])
            resolved_at = now - timedelta(days=td["created_offset_days"] - 2) if td["status"] == TicketStatusEnum.RESOLVED.value else None

            t = Ticket(
                ticket_number=td["number"],
                title=td["title"],
                description=td["description"],
                reporter_id=td["reporter"].id,
                category_id=td["category"].id,
                department_id=td["category"].department_id,
                priority=td["priority"],
                status=td["status"],
                resolution_notes=td.get("resolution_notes"),
                hold_reason=td.get("hold_reason"),
                resolved_at=resolved_at,
                created_at=created_at,
                updated_at=now - timedelta(hours=1),
                is_demo=True,
            )
            db.add(t)
            db.commit()
            db.refresh(t)

            # Initial status history
            db.add(TicketStatusHistory(
                ticket_id=t.id,
                changed_by_id=td["reporter"].id,
                from_status=None,
                to_status=TicketStatusEnum.NEW.value,
                note=f"Ticket submitted and routed to department.",
                created_at=created_at,
            ))
            db.commit()

            # Admin comment if present
            if td.get("admin") and td.get("admin_comment"):
                db.add(TicketComment(
                    ticket_id=t.id,
                    user_id=td["admin"].id,
                    comment_text=td["admin_comment"],
                    is_internal=False,
                    is_info_request=False,
                    created_at=created_at + timedelta(hours=5),
                ))
                db.commit()

            print(f"[*] Demo ticket seeded: {td['number']} — {td['title'][:55]}...")

    db.close()
    print("[✔] Database initialization and seeding complete.")

if __name__ == "__main__":
    seed_database()
