# 🎓 Centralized College Issue and Ticket Management System

An enterprise-grade, full-stack issue tracking and resolution management platform designed for educational institutions. The system enables students, faculty, and administrative staff to report college-related issues, routes tickets automatically to responsible departments via a database-driven category engine, maintains immutable audit trails, and delivers centralized real-time executive analytics to college leadership.

---

## 🏛️ System Overview

In traditional college campuses, maintenance, administrative, and academic complaints are handled through fragmented emails, verbal requests, and paper forms—leading to forgotten issues, delayed responses, and zero institutional accountability.

This application provides a **centralized, secure, and role-governed digital workflow**:
1. **Automated Category Routing**: When a reporter selects an issue category (e.g. *Wi-Fi / Internet* or *Classroom Maintenance*), the system automatically routes the ticket to the responsible department queue (*IT Administration* or *Infrastructure and Maintenance*).
2. **Transparent Ticket Lifecycle**: Full status management through `NEW`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_INFO`, `ON_HOLD`, `RESOLVED`, `CLOSED`, and `REOPENED`.
3. **Mandatory Resolution Notes**: No ticket can be closed without an explicit, recorded resolution description detailing the corrective actions taken.
4. **Structured Unresolved Justifications**: If a department encounters budget, vendor, or technical barriers, it must file a 5-point formal justification audited by the Principal.
5. **Supervisor Executive Oversight**: The Principal has college-wide read access to audit all tickets, departments, and 7 live Recharts analytics dashboards, while **backend APIs strictly block mutations with HTTP 403 Forbidden**.

---

## 💻 Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18, Vite | High-performance Single Page Application (SPA) |
| **Styling** | Tailwind CSS | Modern, responsive utility design with dark/light contrasts |
| **Visualizations** | Recharts | 7 dynamic visualizations (Donut, Bar, Stacked Bar, Line, Pie) |
| **HTTP Client** | Axios | Configured with automatic Bearer JWT auth interceptors |
| **Routing** | React Router v6 | Role-based protected routes and layout nesting |
| **Backend** | FastAPI (Python 3.11) | High-performance asynchronous REST API framework |
| **Data Access** | SQLAlchemy 2.0 ORM | Relationship modeling, composite indexes, connection pooling |
| **Validation** | Pydantic v2 | Strict request/response schema serialization |
| **Security** | OAuth2 + JWT + Bcrypt | Secure token generation, salted password hashing, RBAC dependencies |
| **Database** | PostgreSQL | Relational constraints, foreign keys, index optimization (SQLite fallback in test) |

---

## 👥 User Roles & Permissions Matrix

### 1. Student / Faculty / Staff (Reporter)
- **Secure Authentication**: Dedicated reporter dashboard and portal.
- **Issue Submission Wizard**: 3-step structured submission with category auto-routing preview, subcategories, title, description, and priority level (*Low*, *Medium*, *High*, *Critical*).
- **Ticket Tracking**: Real-time progress monitoring, assigned department visibility, and SLA tracking.
- **Two-Way Communication**: Exchange comments with assigned departments and answer information requests.
- **Issue Reopening**: Can reopen resolved or closed tickets if the problem recurs or is unsatisfactory.
- **Data Boundary**: Strictly isolated to their own submitted tickets.

### 2. Department Administrator (Category Owner)
- **Scoped Queue Management**: Department-specific dashboard displaying *New*, *In Progress*, *Waiting for Info*, *On Hold*, *Resolved*, and *Overdue* tickets.
- **Status Workflow**:
  - *Start Work*: Transitions ticket to `IN_PROGRESS`.
  - *Request Information*: Queries reporter for details; sets status to `WAITING_FOR_INFO`.
  - *Place On Hold*: Pauses ticket with mandatory recorded reason.
  - *Resolve Ticket*: Requires mandatory resolution description (minimum 10 characters).
  - *Cannot Resolve*: Submits formal 5-point justification to the Principal.
- **Internal Staff Notes**: Post private internal notes invisible to reporters.
- **Data Boundary**: Isolated to their assigned department. Cannot access or modify tickets of other departments.

### 3. Principal (College-wide Supervisor)
- **Supervisor Oversight**: Centralized executive dashboard across all departments and campus operations.
- **Read-Only Enforcement**: Can inspect all tickets, status history, and comments, but **backend APIs strictly reject any create, update, assign, or delete operations with HTTP 403 Forbidden**.
- **7 Live Interactive Analytics Visualizations**:
  1. *Resolution Overview*: Donut chart (Resolved vs In Progress vs On Hold vs Pending).
  2. *Issues by Department*: Bar chart comparing departmental volume.
  3. *Issue Trends*: 30-day reporting volume line chart.
  4. *Most Reported Categories*: Horizontal bar chart identifying frequent complaints.
  5. *Department-wise Ticket Status*: Stacked bar chart comparing resolution status per department.
  6. *Average Resolution Time*: Performance benchmark across departments.
  7. *Priority Distribution*: Donut chart showing ticket severity breakdown.
- **Formal Justifications Registry**: Review all unresolved roadblock justifications.
- **Audit CSV Exports**: Download role-filtered CSV reports.

---

## 🔑 User Personas & Development Roles

The database supports authorized accounts representing all campus personas:

| Role | Name | Email | Assigned Department / Scope |
|---|---|---|---|
| **Principal** | Dr. Arthur Pendelton | `principal@college.edu` | Institutional Supervisor (Read-Only) |
| **IT Admin** | Rajesh Sharma | `it.admin@college.edu` | IT Administration |
| **Finance Admin** | Priya Sundaram | `finance.admin@college.edu` | Finance Department |
| **Infra Admin** | Vikram Singh | `infra.admin@college.edu` | Infrastructure and Maintenance |
| **Academics Admin** | Dr. Meenakshi Iyer | `academics.admin@college.edu` | Academics Department |
| **Hostel Admin** | Rakesh Verma | `hostel.admin@college.edu` | Hostel Facilities |
| **Student Reporter** | Alex Rivera | `student.alex@college.edu` | Student Body |
| **Faculty Reporter** | Prof. Sarah Jenkins | `faculty.sarah@college.edu` | Faculty Body |
| **Staff Reporter** | David Miller | `staff.david@college.edu` | Administrative Staff |

> [!NOTE]
> In local development environments, initial test credentials can be initialized via `seed.py`. In production deployments, demo accounts and test credentials are automatically deactivated; accounts must be created and authenticated using secure institutional credentials and strong passwords.

---

## 🚀 Quick Start Guide

### Option A: Windows PowerShell (Recommended)
From the project root directory, run:
```powershell
.\start.ps1
```
The script will verify Python and Node.js, run database master seeding, start the FastAPI backend on port 8000, and launch the Vite dev server on port 5174.

### Option B: Windows Command Prompt
```cmd
start.bat
```

### Option C: Linux / macOS (Bash)
```bash
chmod +x start.sh
./start.sh
```

---

## 🗄️ PostgreSQL Production Configuration

1. Install PostgreSQL 14+ on your system or server.
2. Create the production database and user:
   ```sql
   CREATE DATABASE college_issue_db;
   CREATE USER college_user WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD';
   GRANT ALL PRIVILEGES ON DATABASE college_issue_db TO college_user;
   ```
3. Copy `backend/.env.example` to `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
4. Configure your `DATABASE_URL` in `backend/.env`:
   ```ini
   DATABASE_URL="postgresql://college_user:YOUR_STRONG_PASSWORD@localhost:5432/college_issue_db"
   ```
5. Run the master data seeder:
   ```bash
   cd backend
   python seed.py
   ```
   *(By default, `seed.py` creates master data, test login accounts, and exactly 2 initial demonstration tickets: `COL-2026-0001` in IT Administration with status `IN_PROGRESS`, and `COL-2026-0002` in Finance with status `RESOLVED` and explicit resolution notes).*

---

## 🧪 Automated Backend Test Suite

To verify all security restrictions, RBAC guards, and routing algorithms:
```bash
cd backend
python test_suite.py
```

Expected output:
```text
Ran 9 tests in 4.285s
OK
[PASS] 01: All sample user accounts and bcrypt credentials verified.
[PASS] 02: Ticket COL-2026-0001 created and automatically routed to IT Administration.
[PASS] 03: Status transitioned to IN_PROGRESS and audit trail recorded.
[PASS] 04: Mandatory resolution description validated.
[PASS] 05: Department isolation verified: Finance Admin cannot modify IT tickets.
[PASS] 06: Unresolved issue formal justification submitted, linked, and status updated.
[PASS] 07: Principal backend mutation restriction strictly enforced (403 Forbidden).
[PASS] 08: Principal real-time analytics aggregation and visualization data verified.
[PASS] 09: Role-filtered CSV exports verified.
```

---

## 📁 Project Structure

```
college-issue-management/
├── .env.example                    # Environment variable template
├── README.md                       # Comprehensive system documentation
├── start.ps1                       # Windows PowerShell startup automation
├── start.sh                        # Linux / macOS bash startup automation
├── start.bat                       # Windows CMD startup launcher
│
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── api/                    # REST API Endpoints
│   │   │   ├── auth.py             # Login, register, token, /me
│   │   │   ├── tickets.py          # CRUD, routing, status, comments, justifications
│   │   │   ├── analytics.py        # Principal & Department Recharts aggregations
│   │   │   ├── departments.py      # Department directory
│   │   │   ├── categories.py       # Category & subcategory routing rules
│   │   │   ├── reports.py          # Scoped CSV export
│   │   │   └── notifications.py    # In-app notification center
│   │   ├── core/                   # Security, DB session, RBAC dependencies
│   │   │   ├── config.py           # Environment settings
│   │   │   ├── database.py         # SQLAlchemy engine & session maker
│   │   │   ├── security.py         # JWT tokens & Bcrypt hashing
│   │   │   └── dependencies.py     # block_principal_mutation & role guards
│   │   ├── models/                 # SQLAlchemy Relational Models
│   │   ├── schemas/                # Pydantic v2 Request/Response Schemas
│   │   └── services/               # Core Business Logic & Routing Engines
│   ├── seed.py                     # Master database initializer
│   ├── reset_tickets.py            # Development ticket reset utility
│   ├── test_suite.py               # 9-point automated regression test suite
│   └── requirements.txt            # Python dependencies
│
├── frontend/                       # React 18 + Vite Frontend Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/             # Recharts visualizations (Donut, Bar, Trends...)
│   │   │   ├── common/             # Navbar, Sidebar, Modal, Badges, Toast, FilterBar
│   │   │   └── tickets/            # TicketTimeline, CommentThread, JustificationCard
│   │   ├── context/                # AuthContext & NotificationContext
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Institutional login with demo account selector
│   │   │   ├── reporter/           # ReporterDashboard, RaiseTicket, TicketList, TicketDetail
│   │   │   ├── dept/               # DeptDashboard, DeptTicketList, DeptTicketDetail
│   │   │   └── principal/          # PrincipalDashboard, TicketList, TicketDetail, Justifications
│   │   ├── services/               # Axios API abstraction services
│   │   ├── App.jsx                 # Main Router with role-based Route Guards
│   │   └── main.jsx                # Application Entrypoint
│   └── package.json
│
└── project_documentation/          # Architecture Diagrams & Presentation Assets
    ├── System_Architecture.png     # 3-tier enterprise architecture diagram
    ├── Ticket_Workflow.png         # State transition lifecycle machine diagram
    ├── Role_Based_Access_Flowchart.png # RBAC permissions matrix diagram
    ├── Database_ER_Diagram.png     # PostgreSQL schema entity relationship diagram
    ├── College_Ticket_Management_Presentation.docx # 10-slide executive Word presentation
    ├── College_Ticket_Management_Presentation.html # Interactive HTML presentation slide deck
    └── generate_docs.py            # Diagram & presentation generation script
```

---

## 🛡️ Security & Architectural Highlights

- **Backend Enforcement of Read-Only Principal**: While the frontend omits edit buttons, the backend API route handlers actively execute the `block_principal_mutation` dependency. Any direct `POST`, `PATCH`, or `PUT` request containing a Principal JWT token is immediately rejected with `403 Forbidden`.
- **Department Queue Isolation**: Department administrators are restricted via SQLAlchemy query filters to `department_id == user.department_id`. Cross-department updates trigger immediate `403 Forbidden` errors.
- **Zero-Trust Input Validation**: Pydantic v2 validates all payloads (resolution notes min 10 chars, justifications min 20 chars).
- **Stateless Bearer JWT**: Secure token generation with HMAC-SHA256 signature and 24-hour expiration.

---

## 📄 License & Institutional Credits

Developed for academic institution campus operations and management. Released under the MIT License.
