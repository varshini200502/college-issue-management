import os
import sys

# Ensure writable matplotlib config
os.environ["MPLCONFIGDIR"] = os.path.join(os.path.dirname(__file__), ".mpl_cache")
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_system_architecture():
    print("[*] Generating System_Architecture.png...")
    fig, ax = plt.subplots(figsize=(14, 10), dpi=300)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 10)
    ax.axis("off")

    # Title
    ax.text(7, 9.6, "Centralized College Issue & Ticket Management System", 
            ha="center", va="center", fontsize=18, fontweight="bold", color="#1e293b")
    ax.text(7, 9.2, "Three-Tier Enterprise Architecture & Security Boundary", 
            ha="center", va="center", fontsize=12, color="#64748b")

    # Tier 1: Client / Presentation Layer
    tier1 = patches.FancyBboxPatch((0.8, 6.2), 12.4, 2.5, boxstyle="round,pad=0.2",
                                   ec="#3b82f6", fc="#eff6ff", lw=2, linestyle="--")
    ax.add_patch(tier1)
    ax.text(1.2, 8.4, "PRESENTATION TIER (Single Page Application - React 18 + Vite + Tailwind CSS)", 
            fontsize=11, fontweight="bold", color="#1e40af")

    # Client Cards
    clients = [
        ("Student / Faculty / Staff\n(Reporter Portal)", "Issue submission wizard\nCategory routing preview\nOwn ticket history & reopen\nInteractive comment thread", "#3b82f6", 1.2),
        ("Department Admin\n(Queue Management)", "Scoped department tickets\nStatus workflow transitions\nMandatory resolution notes\nFormal unresolved justifications", "#0284c7", 5.2),
        ("Principal / Executive\n(Supervisor Oversight)", "Read-only institutional audit\n7 interactive Recharts visuals\nUnresolved justifications registry\nRole-scoped CSV exports", "#7c3aed", 9.2)
    ]
    for title, desc, col, x in clients:
        box = patches.FancyBboxPatch((x, 6.4), 3.6, 1.8, boxstyle="round,pad=0.15", ec=col, fc="#ffffff", lw=1.5)
        ax.add_patch(box)
        ax.text(x + 1.8, 7.8, title, ha="center", va="center", fontsize=9.5, fontweight="bold", color=col)
        ax.text(x + 1.8, 7.0, desc, ha="center", va="center", fontsize=8, color="#334155", linespacing=1.3)

    # Arrow Tier 1 -> Tier 2
    ax.annotate("", xy=(7, 5.4), xytext=(7, 6.2),
                arrowprops=dict(arrowstyle="<->", color="#64748b", lw=2))
    ax.text(7.2, 5.8, "HTTPS / REST JSON API / Bearer JWT", fontsize=9, fontweight="bold", color="#475569")

    # Tier 2: Application / Service Layer
    tier2 = patches.FancyBboxPatch((0.8, 2.8), 12.4, 2.5, boxstyle="round,pad=0.2",
                                   ec="#10b981", fc="#ecfdf5", lw=2, linestyle="--")
    ax.add_patch(tier2)
    ax.text(1.2, 5.0, "APPLICATION TIER (FastAPI Backend + SQLAlchemy ORM + Pydantic v2)", 
            fontsize=11, fontweight="bold", color="#065f46")

    services = [
        ("Core Security & RBAC", "OAuth2 Password Bearer\nBcrypt password hashing\nblock_principal_mutation (403)\nRole dependency guards", "#059669", 1.2),
        ("Ticket Workflow Engine", "Automated Category Routing\nUnique ID: COL-YYYY-XXXX\nMandatory notes validator\nSLA overdue detector", "#0d9488", 5.2),
        ("Analytics & Reporting", "Principal 7-chart aggregation\nAvg resolution time metrics\nDepartment workload KPIs\nStreaming CSV generator", "#0284c7", 9.2)
    ]
    for title, desc, col, x in services:
        box = patches.FancyBboxPatch((x, 3.0), 3.6, 1.8, boxstyle="round,pad=0.15", ec=col, fc="#ffffff", lw=1.5)
        ax.add_patch(box)
        ax.text(x + 1.8, 4.4, title, ha="center", va="center", fontsize=9.5, fontweight="bold", color=col)
        ax.text(x + 1.8, 3.6, desc, ha="center", va="center", fontsize=8, color="#334155", linespacing=1.3)

    # Arrow Tier 2 -> Tier 3
    ax.annotate("", xy=(7, 2.0), xytext=(7, 2.8),
                arrowprops=dict(arrowstyle="<->", color="#64748b", lw=2))
    ax.text(7.2, 2.4, "SQLAlchemy Engine / Connection Pool", fontsize=9, fontweight="bold", color="#475569")

    # Tier 3: Persistence Layer
    tier3 = patches.FancyBboxPatch((0.8, 0.4), 12.4, 1.5, boxstyle="round,pad=0.2",
                                   ec="#f59e0b", fc="#fffbeb", lw=2, linestyle="--")
    ax.add_patch(tier3)
    ax.text(1.2, 1.6, "PERSISTENCE TIER (Relational Database - PostgreSQL in Production / SQLite in Test)", 
            fontsize=11, fontweight="bold", color="#92400e")

    db_boxes = [
        ("PostgreSQL Database", "Relational constraints, Foreign Keys, Composite indexes\nMaster tables: roles, departments, categories, subcategories", 1.2, 5.6),
        ("Operational Entities", "tickets, ticket_comments, ticket_status_history\nticket_justifications, notifications, audit_logs", 7.2, 5.6)
    ]
    for title, desc, x, w in db_boxes:
        box = patches.FancyBboxPatch((x, 0.55), w, 0.9, boxstyle="round,pad=0.1", ec="#d97706", fc="#ffffff", lw=1.2)
        ax.add_patch(box)
        ax.text(x + w/2, 1.15, title, ha="center", va="center", fontsize=9, fontweight="bold", color="#b45309")
        ax.text(x + w/2, 0.8, desc, ha="center", va="center", fontsize=8, color="#475569")

    plt.tight_layout()
    out_path = os.path.join(DOCS_DIR, "System_Architecture.png")
    plt.savefig(out_path, bbox_inches="tight")
    plt.close()
    print(f"[✔] Created: {out_path}")

def generate_ticket_workflow():
    print("[*] Generating Ticket_Workflow.png...")
    fig, ax = plt.subplots(figsize=(14, 9), dpi=300)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 9)
    ax.axis("off")

    ax.text(7, 8.6, "Ticket Lifecycle & Status Transition State Machine", 
            ha="center", va="center", fontsize=18, fontweight="bold", color="#1e293b")
    ax.text(7, 8.2, "Automated Routing, Department Investigation, Justification & Resolution", 
            ha="center", va="center", fontsize=12, color="#64748b")

    # Workflow Steps
    nodes = [
        ("Reporter Submits Issue", "Selected Category\nPriority (Low to Critical)", 1.0, 6.0, "#3b82f6"),
        ("Automated Routing Engine", "Category to Department DB mapping\nGenerates COL-YYYY-XXXX", 4.2, 6.0, "#6366f1"),
        ("NEW", "Appears in Dept Queue\nEmail/In-app notification", 7.4, 6.0, "#0284c7"),
        ("IN_PROGRESS", "Department Admin investigation\nInitial diagnosis started", 10.6, 6.0, "#eab308"),
    ]

    for title, desc, x, y, col in nodes:
        box = patches.FancyBboxPatch((x, y), 2.4, 1.3, boxstyle="round,pad=0.1", ec=col, fc="#ffffff", lw=2)
        ax.add_patch(box)
        ax.text(x + 1.2, y + 0.9, title, ha="center", va="center", fontsize=9, fontweight="bold", color=col)
        ax.text(x + 1.2, y + 0.45, desc, ha="center", va="center", fontsize=7.5, color="#475569")

    # Arrows top line
    ax.annotate("", xy=(4.2, 6.65), xytext=(3.4, 6.65), arrowprops=dict(arrowstyle="->", color="#3b82f6", lw=2))
    ax.annotate("", xy=(7.4, 6.65), xytext=(6.6, 6.65), arrowprops=dict(arrowstyle="->", color="#6366f1", lw=2))
    ax.annotate("", xy=(10.6, 6.65), xytext=(9.8, 6.65), arrowprops=dict(arrowstyle="->", color="#0284c7", lw=2))

    # Branch Nodes
    # 1. Waiting for info
    b1 = patches.FancyBboxPatch((10.6, 3.6), 2.4, 1.2, boxstyle="round,pad=0.1", ec="#f97316", fc="#ffffff", lw=1.8)
    ax.add_patch(b1)
    ax.text(11.8, 4.4, "WAITING FOR INFO", ha="center", va="center", fontsize=8.5, fontweight="bold", color="#ea580c")
    ax.text(11.8, 3.95, "Admin requests details\nReporter responds in app", ha="center", va="center", fontsize=7.5, color="#475569")

    ax.annotate("", xy=(11.8, 4.8), xytext=(11.8, 6.0), arrowprops=dict(arrowstyle="<->", color="#f97316", lw=1.5))
    ax.text(12.0, 5.4, "Request / Reply", fontsize=7.5, color="#ea580c")

    # 2. On Hold
    b2 = patches.FancyBboxPatch((7.4, 3.6), 2.4, 1.2, boxstyle="round,pad=0.1", ec="#64748b", fc="#ffffff", lw=1.8)
    ax.add_patch(b2)
    ax.text(8.6, 4.4, "ON HOLD", ha="center", va="center", fontsize=8.5, fontweight="bold", color="#475569")
    ax.text(8.6, 3.95, "Mandatory hold reason\nWaiting parts / approvals", ha="center", va="center", fontsize=7.5, color="#475569")

    ax.annotate("", xy=(8.6, 4.8), xytext=(10.6, 6.0), arrowprops=dict(arrowstyle="<->", color="#64748b", lw=1.5))

    # 3. Cannot Resolve / Formal Justification
    b3 = patches.FancyBboxPatch((4.2, 3.6), 2.4, 1.2, boxstyle="round,pad=0.1", ec="#dc2626", fc="#fff5f5", lw=1.8)
    ax.add_patch(b3)
    ax.text(5.4, 4.4, "CANNOT RESOLVE", ha="center", va="center", fontsize=8.5, fontweight="bold", color="#dc2626")
    ax.text(5.4, 3.95, "Mandatory 5-field justification\nAudited by Principal", ha="center", va="center", fontsize=7.5, color="#475569")

    ax.annotate("", xy=(5.4, 4.8), xytext=(10.6, 6.2), arrowprops=dict(arrowstyle="->", color="#dc2626", lw=1.5, connectionstyle="arc3,rad=-0.2"))

    # 4. Resolved
    b4 = patches.FancyBboxPatch((10.6, 1.0), 2.4, 1.3, boxstyle="round,pad=0.1", ec="#16a34a", fc="#f0fdf4", lw=2)
    ax.add_patch(b4)
    ax.text(11.8, 1.9, "RESOLVED", ha="center", va="center", fontsize=9, fontweight="bold", color="#15803d")
    ax.text(11.8, 1.4, "Mandatory resolution notes\nTimestamp & Admin ID logged", ha="center", va="center", fontsize=7.5, color="#475569")

    ax.annotate("", xy=(11.8, 2.3), xytext=(11.8, 3.6), arrowprops=dict(arrowstyle="<-", color="#16a34a", lw=2))

    # 5. Reopened
    b5 = patches.FancyBboxPatch((4.2, 1.0), 2.4, 1.3, boxstyle="round,pad=0.1", ec="#9333ea", fc="#faf5ff", lw=2)
    ax.add_patch(b5)
    ax.text(5.4, 1.9, "REOPENED", ha="center", va="center", fontsize=9, fontweight="bold", color="#7e22ce")
    ax.text(5.4, 1.4, "Reporter unsatisfied\nReopen reason recorded", ha="center", va="center", fontsize=7.5, color="#475569")

    ax.annotate("", xy=(6.6, 1.65), xytext=(10.6, 1.65), arrowprops=dict(arrowstyle="->", color="#9333ea", lw=1.8))
    ax.text(8.6, 1.85, "Reporter Reopens", ha="center", fontsize=8, fontweight="bold", color="#7e22ce")
    ax.annotate("", xy=(10.6, 6.4), xytext=(5.4, 2.3), arrowprops=dict(arrowstyle="->", color="#9333ea", lw=1.8, connectionstyle="arc3,rad=0.3"))

    plt.tight_layout()
    out_path = os.path.join(DOCS_DIR, "Ticket_Workflow.png")
    plt.savefig(out_path, bbox_inches="tight")
    plt.close()
    print(f"[✔] Created: {out_path}")

def generate_rbac_flowchart():
    print("[*] Generating Role_Based_Access_Flowchart.png...")
    fig, ax = plt.subplots(figsize=(14, 9), dpi=300)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 9)
    ax.axis("off")

    ax.text(7, 8.6, "Role-Based Access Control (RBAC) Permission Matrix", 
            ha="center", va="center", fontsize=18, fontweight="bold", color="#1e293b")
    ax.text(7, 8.2, "Three Authorized Personas with Backend Architectural Boundaries", 
            ha="center", va="center", fontsize=12, color="#64748b")

    cols = [
        ("STUDENT / FACULTY / STAFF\n(Reporter)", "#2563eb", 1.0, [
            ("Raise New Issues", "Select category, set priority, write description"),
            ("Track Own Tickets", "View status, SLA, and assigned department"),
            ("Communication", "Post comments, respond to info requests"),
            ("Reopen Tickets", "Reopen resolved issues if problem persists"),
            ("Access Boundary", "STRICT: Can NEVER view or access tickets of others")
        ]),
        ("DEPARTMENT ADMIN\n(Category Owner)", "#0d9488", 5.2, [
            ("Manage Department Queue", "Inspect all tickets routed to own department"),
            ("Status Transitions", "Start Work, Request Info, Put on Hold"),
            ("Mandatory Resolutions", "Resolve tickets with detailed diagnosis notes"),
            ("Formal Justifications", "File structured 5-field roadblock justifications"),
            ("Access Boundary", "ISOLATED: Cannot view or edit other department tickets")
        ]),
        ("PRINCIPAL / EXECUTIVE\n(Supervisor Oversight)", "#7c3aed", 9.4, [
            ("College-wide Audit", "Full read access across ALL departments"),
            ("Executive Analytics", "7 real-time Recharts dashboards and metrics"),
            ("Justifications Registry", "Audit unresolved roadblocks and vendor dependencies"),
            ("Audit CSV Export", "Role-filtered and date-filtered reporting"),
            ("Access Boundary", "READ-ONLY: Backend 403 blocks ANY ticket mutations")
        ])
    ]

    for title, color, x, items in cols:
        # Header Box
        hdr = patches.FancyBboxPatch((x, 6.4), 3.6, 1.4, boxstyle="round,pad=0.15", ec=color, fc=color, lw=1.5)
        ax.add_patch(hdr)
        ax.text(x + 1.8, 7.1, title, ha="center", va="center", fontsize=10, fontweight="bold", color="#ffffff")

        # Container
        body = patches.FancyBboxPatch((x, 0.6), 3.6, 5.6, boxstyle="round,pad=0.15", ec=color, fc="#f8fafc", lw=1.2)
        ax.add_patch(body)

        y_pos = 5.7
        for feature, detail in items:
            is_boundary = "Boundary" in feature
            box_bg = "#fef2f2" if is_boundary and "READ-ONLY" in detail or "STRICT" in detail else "#ffffff"
            box_ec = "#ef4444" if is_boundary else "#cbd5e1"
            
            ibox = patches.FancyBboxPatch((x + 0.2, y_pos - 0.75), 3.2, 0.85, boxstyle="round,pad=0.08", ec=box_ec, fc=box_bg, lw=1)
            ax.add_patch(ibox)
            
            f_col = "#dc2626" if is_boundary else color
            ax.text(x + 0.35, y_pos - 0.15, feature, fontsize=8.5, fontweight="bold", color=f_col)
            ax.text(x + 0.35, y_pos - 0.45, detail, fontsize=7.5, color="#475569")
            y_pos -= 1.05

    plt.tight_layout()
    out_path = os.path.join(DOCS_DIR, "Role_Based_Access_Flowchart.png")
    plt.savefig(out_path, bbox_inches="tight")
    plt.close()
    print(f"[✔] Created: {out_path}")

def generate_er_diagram():
    print("[*] Generating Database_ER_Diagram.png...")
    fig, ax = plt.subplots(figsize=(15, 10), dpi=300)
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 10)
    ax.axis("off")

    ax.text(7.5, 9.6, "Relational Database Schema & Entity Relationships", 
            ha="center", va="center", fontsize=18, fontweight="bold", color="#1e293b")
    ax.text(7.5, 9.2, "PostgreSQL Data Models, Foreign Keys & Normalized Constraints", 
            ha="center", va="center", fontsize=12, color="#64748b")

    entities = [
        # Roles
        ("roles", 0.8, 6.8, 2.4, 1.8, "#64748b", [
            ("PK id", "INTEGER"),
            ("name", "VARCHAR(50) UNIQUE"),
            ("description", "VARCHAR(255)"),
            ("created_at", "TIMESTAMP")
        ]),
        # Departments
        ("departments", 3.8, 6.8, 2.8, 2.0, "#0284c7", [
            ("PK id", "INTEGER"),
            ("name", "VARCHAR(100) UNIQUE"),
            ("code", "VARCHAR(20) UNIQUE"),
            ("description", "TEXT"),
            ("is_active", "BOOLEAN")
        ]),
        # Categories
        ("categories", 7.2, 6.8, 2.8, 2.0, "#0d9488", [
            ("PK id", "INTEGER"),
            ("FK department_id", "INTEGER"),
            ("name", "VARCHAR(100)"),
            ("code", "VARCHAR(50)"),
            ("is_active", "BOOLEAN")
        ]),
        # Subcategories
        ("subcategories", 10.6, 6.8, 2.8, 1.8, "#0d9488", [
            ("PK id", "INTEGER"),
            ("FK category_id", "INTEGER"),
            ("name", "VARCHAR(100)"),
            ("is_active", "BOOLEAN")
        ]),
        # Users
        ("users", 0.8, 3.2, 2.6, 2.8, "#2563eb", [
            ("PK id", "INTEGER"),
            ("email", "VARCHAR(255) UNIQUE"),
            ("hashed_password", "VARCHAR(255)"),
            ("full_name", "VARCHAR(150)"),
            ("FK role_id", "INTEGER"),
            ("FK department_id", "INTEGER (Nullable)"),
            ("reporter_type", "VARCHAR(50)"),
            ("phone", "VARCHAR(50)")
        ]),
        # Tickets (Centerpiece)
        ("tickets", 4.4, 2.8, 3.4, 3.4, "#1e293b", [
            ("PK id", "INTEGER"),
            ("ticket_number", "VARCHAR(50) UNIQUE"),
            ("title", "VARCHAR(255)"),
            ("description", "TEXT"),
            ("FK reporter_id", "INTEGER"),
            ("FK department_id", "INTEGER"),
            ("FK category_id", "INTEGER"),
            ("priority", "VARCHAR(20)"),
            ("status", "VARCHAR(30)"),
            ("resolution_notes", "TEXT (Nullable)")
        ]),
        # Ticket Status History
        ("ticket_status_history", 8.6, 3.8, 2.8, 2.2, "#8b5cf6", [
            ("PK id", "INTEGER"),
            ("FK ticket_id", "INTEGER"),
            ("FK changed_by_id", "INTEGER"),
            ("from_status", "VARCHAR(30)"),
            ("to_status", "VARCHAR(30)"),
            ("note", "TEXT")
        ]),
        # Ticket Justifications
        ("ticket_justifications", 12.0, 3.8, 2.6, 2.2, "#dc2626", [
            ("PK id", "INTEGER"),
            ("FK ticket_id", "INTEGER UNIQUE"),
            ("FK admin_id", "INTEGER"),
            ("reason_code", "VARCHAR(100)"),
            ("explanation", "TEXT"),
            ("external_support", "BOOLEAN")
        ]),
        # Ticket Comments
        ("ticket_comments", 8.6, 0.8, 2.8, 2.2, "#f59e0b", [
            ("PK id", "INTEGER"),
            ("FK ticket_id", "INTEGER"),
            ("FK user_id", "INTEGER"),
            ("comment_text", "TEXT"),
            ("is_internal", "BOOLEAN"),
            ("is_info_request", "BOOLEAN")
        ]),
        # Notifications
        ("notifications", 3.8, 0.8, 2.8, 1.8, "#ec4899", [
            ("PK id", "INTEGER"),
            ("FK user_id", "INTEGER"),
            ("FK ticket_id", "INTEGER (Nullable)"),
            ("title", "VARCHAR(200)"),
            ("is_read", "BOOLEAN")
        ])
    ]

    for name, x, y, w, h, col, fields in entities:
        # Header
        hdr = patches.FancyBboxPatch((x, y + h - 0.5), w, 0.5, boxstyle="round,pad=0.05", ec=col, fc=col, lw=1.2)
        ax.add_patch(hdr)
        ax.text(x + w/2, y + h - 0.25, name.upper(), ha="center", va="center", fontsize=8.5, fontweight="bold", color="#ffffff")

        # Body
        body = patches.FancyBboxPatch((x, y), w, h - 0.5, boxstyle="round,pad=0.05", ec=col, fc="#ffffff", lw=1.2)
        ax.add_patch(body)

        fy = y + h - 0.8
        for fname, ftype in fields:
            is_pk = "PK" in fname
            is_fk = "FK" in fname
            fcolor = "#b91c1c" if is_pk else ("#2563eb" if is_fk else "#334155")
            ax.text(x + 0.15, fy, fname, fontsize=7, fontweight="bold" if is_pk or is_fk else "normal", color=fcolor)
            ax.text(x + w - 0.15, fy, ftype, ha="right", fontsize=6.5, color="#64748b")
            fy -= 0.26

    plt.tight_layout()
    out_path = os.path.join(DOCS_DIR, "Database_ER_Diagram.png")
    plt.savefig(out_path, bbox_inches="tight")
    plt.close()
    print(f"[✔] Created: {out_path}")

def generate_presentation_document():
    print("[*] Generating College_Ticket_Management_Presentation.docx...")
    import docx
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = docx.Document()

    # Title Slide / Cover
    title = doc.add_heading("Centralized College Issue and Ticket Management System", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle = doc.add_paragraph("Full-Stack Enterprise Issue Resolution, Department Routing & Executive Analytics Platform")
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph("\nAuthor: Senior Full-Stack Software Engineer & UI/UX Designer\nInstitution: Academic Operations & Administration\nDate: Academic Year 2026\n")
    doc.add_page_break()

    # Slides / Sections
    slides = [
        ("Slide 1: Executive Summary & Project Purpose", 
         "The Centralized College Issue and Ticket Management System provides a unified, secure platform for students, faculty, and administrative staff to report institutional problems, automatically route them to responsible campus departments, maintain end-to-end transparent audit trails, and deliver executive-level supervisory analytics to the Principal."),
        
        ("Slide 2: Technology Stack & Architectural Decisions",
         "Frontend: React 18 with Vite, Tailwind CSS utility styling, Recharts visualization library, Axios HTTP client, React Router v6.\n"
         "Backend: FastAPI (Python 3.11), SQLAlchemy ORM with connection pooling, Pydantic v2 schemas, OAuth2 JWT bearer tokens.\n"
         "Database: PostgreSQL (production) with complete normalization, relational constraints, and compound indexing; SQLite test runner for automated regression validation."),
        
        ("Slide 3: Persona Breakdown & RBAC Boundaries",
         "1. Reporter (Student/Faculty/Staff): Can raise issues, select categories, track real-time status, post comments, and reopen issues if resolution is incomplete.\n"
         "2. Department Administrator: Authorized queue manager for assigned department. Transitions ticket states, logs mandatory resolution descriptions, and files formal justifications.\n"
         "3. Principal (Supervisor Oversight): STRICTLY READ-ONLY. Institutional visibility across all departments and analytics, but backend APIs strictly block mutations with HTTP 403 Forbidden."),

        ("Slide 4: Automated Category-to-Department Routing Engine",
         "Eliminates hardcoded mappings by querying the relational database for active category configurations.\n"
         "Examples:\n- Wi-Fi / Computers -> IT Administration\n- Fee Payment / Receipts -> Finance\n- Classroom Maintenance / Electrical -> Infrastructure and Maintenance\n- Transcripts / Records -> Academics\n- Bus Routes -> Transport"),

        ("Slide 5: Ticket Lifecycle & The Six Essential States",
         "1. NEW: Routed and queued in department inbox.\n"
         "2. IN_PROGRESS: Investigation commenced by department technician.\n"
         "3. WAITING_FOR_INFO: Department requests clarifications from reporter.\n"
         "4. ON_HOLD: Temporarily paused with mandatory recorded reason.\n"
         "5. RESOLVED: Marked fixed with mandatory written resolution description.\n"
         "6. REOPENED: Reopened by reporter if problem persists."),

        ("Slide 6: Unresolved Issue Formal Justification Process",
         "When an issue cannot be resolved, the department cannot silently abandon it. A structured 5-field formal justification is required:\n"
         "- Reason Code (Budget, Insufficient Resources, Technical, Vendor, Policy)\n"
         "- Detailed Explanation (min 20 characters)\n"
         "- Diagnostic Actions Attempted\n"
         "- Challenges & Limitations Encountered\n"
         "- External Vendor Dependency & Next Proposed Action\n"
         "All justifications are audited by the Principal."),

        ("Slide 7: Principal Executive Analytics Suite",
         "Seven live Recharts visualizations populated dynamically from the database:\n"
         "1. Donut Chart: Resolution distribution (Resolved, In Progress, On Hold, Pending)\n"
         "2. Bar Chart: Ticket volume by department\n"
         "3. Line Chart: 30-day reporting trends\n"
         "4. Horizontal Bar: Top reported complaint categories\n"
         "5. Stacked Bar: Department status distribution\n"
         "6. Bar Chart: Average resolution time across departments\n"
         "7. Donut Chart: Priority distribution (Low, Medium, High, Critical)"),

        ("Slide 8: Quality Assurance & Backend Test Suite",
         "All 9 critical workflows verified by automated regression test suite:\n"
         "- Account password hashing and authentication\n"
         "- Unique ticket ID format (COL-YYYY-XXXX) and routing\n"
         "- Audit timeline preservation\n"
         "- Mandatory resolution notes enforcement\n"
         "- Cross-department data isolation\n"
         "- Formal justification persistence\n"
         "- Principal 403 Forbidden mutation rejection\n"
         "- Live analytics calculation\n"
         "- Scoped CSV audit report generation"),

        ("Slide 9: Deployment & Execution Guide",
         "One-click cross-platform startup scripts provided:\n"
         "- start.ps1: Windows PowerShell startup automation\n"
         "- start.sh: Linux / macOS bash startup automation\n"
         "- start.bat: Windows Command Prompt launcher\n"
         "Automatic database seeding of roles, departments, categories, and sample test accounts.")
    ]

    for slide_title, slide_body in slides:
        doc.add_heading(slide_title, level=1)
        doc.add_paragraph(slide_body)
        doc.add_paragraph("")

    out_doc = os.path.join(DOCS_DIR, "College_Ticket_Management_Presentation.docx")
    doc.save(out_doc)
    print(f"[✔] Created: {out_doc}")

if __name__ == "__main__":
    generate_system_architecture()
    generate_ticket_workflow()
    generate_rbac_flowchart()
    generate_er_diagram()
    generate_presentation_document()
    print("\n[✔] All visual documentation and presentation assets generated successfully!")
