"""
create_college_db.py
====================
Creates the `college_issue_db` logical database on the existing Render
PostgreSQL server WITHOUT touching careconnect_db_p0bs or any CareConnect data.

USAGE — run once, locally, with Render's External Database URL:

    DATABASE_ADMIN_URL="postgres://careconnect_user:<password>@<external-host>.render.com:5432/careconnect_db_p0bs" \
        python create_college_db.py

The script will:
  1. Connect via SSL (required for Render external URLs).
  2. Pre-check whether the connected user has CREATEDB privilege.
  3. List existing databases (read-only inspection).
  4. Confirm careconnect_db_p0bs exists and is UNTOUCHED.
  5. Confirm you are connected to the correct server (host check).
  6. Check whether college_issue_db already exists.
  7. Create college_issue_db only if it does not exist.
  8. Grant ALL PRIVILEGES on the new database to the current user.
  9. Exit without modifying any existing data or tables.

NEVER run Alembic or seed.py against careconnect_db_p0bs.
NEVER commit DATABASE_ADMIN_URL to Git.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from urllib.parse import urlparse

TARGET_DB = "college_issue_db"
PROTECTED_DB = "careconnect_db_p0bs"


def redact_url(url: str) -> str:
    """Return the URL with the password replaced by ***."""
    try:
        parsed = urlparse(url)
        if parsed.password:
            url = url.replace(parsed.password, "***", 1)
    except Exception:
        pass
    return url


def main():
    admin_url = os.getenv("DATABASE_ADMIN_URL")
    if not admin_url:
        print("ERROR: DATABASE_ADMIN_URL environment variable is not set.")
        print()
        print("  Set it to your Render External Database URL, e.g.:")
        print("  DATABASE_ADMIN_URL='postgres://careconnect_user:<pwd>@<host>.render.com:5432/careconnect_db_p0bs'")
        print("  python create_college_db.py")
        sys.exit(1)

    # Normalize postgres:// -> postgresql:// (SQLAlchemy/psycopg2 requirement)
    if admin_url.startswith("postgres://"):
        admin_url = admin_url.replace("postgres://", "postgresql://", 1)

    # Parse the URL to extract components for validation and display
    try:
        parsed = urlparse(admin_url)
        connected_host = parsed.hostname or ""
        connected_db   = parsed.path.lstrip("/")
        connected_user = parsed.username or ""
    except Exception as e:
        print(f"ERROR: Could not parse DATABASE_ADMIN_URL: {e}")
        sys.exit(1)

    print(f"\n[*] Connecting to PostgreSQL server...")
    print(f"[*] Host           : {connected_host}")
    print(f"[*] Auth database  : {connected_db}")
    print(f"[*] User           : {connected_user}")
    print(f"[*] Target new DB  : {TARGET_DB}")
    print(f"[*] Protected DB   : {PROTECTED_DB} (will NOT be modified)\n")

    # Safety check: refuse to run if the URL already points to college_issue_db
    if connected_db == TARGET_DB:
        print(f"ERROR: DATABASE_ADMIN_URL points to '{TARGET_DB}' directly.")
        print(f"       Connect via '{PROTECTED_DB}' (or postgres database) for server-level operations.")
        sys.exit(1)

    # Connect with SSL (required for Render external connections)
    try:
        conn = psycopg2.connect(admin_url, sslmode="require")
    except psycopg2.OperationalError as e:
        # Redact password from error message before printing
        err_msg = str(e).replace(parsed.password or "", "***") if parsed.password else str(e)
        print(f"ERROR: Could not connect to PostgreSQL.")
        print(f"       {err_msg}")
        print()
        print("  Common causes:")
        print("  - Wrong password (rotate on Render, then update DATABASE_ADMIN_URL)")
        print("  - Using Internal URL from outside Render (use External URL locally)")
        print("  - SSL not supported on this host (unlikely for Render)")
        sys.exit(1)
    except Exception as e:
        err_msg = str(e).replace(parsed.password or "", "***") if parsed.password else str(e)
        print(f"ERROR: Unexpected connection error: {err_msg}")
        sys.exit(1)

    # AUTOCOMMIT is required — CREATE DATABASE cannot run inside a transaction block
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    # ── Step 1: Pre-check CREATEDB privilege ─────────────────────────────────
    cur.execute(
        "SELECT rolcreatedb FROM pg_roles WHERE rolname = current_user;"
    )
    row = cur.fetchone()
    if not row:
        print("ERROR: Could not query pg_roles for current user.")
        cur.close(); conn.close(); sys.exit(1)

    has_createdb = row[0]
    if has_createdb:
        print(f"[✓] User '{connected_user}' has CREATEDB privilege.")
    else:
        print(f"[✗] User '{connected_user}' does NOT have CREATEDB privilege.")
        print()
        print("  The script cannot create the database. Ask your Render PostgreSQL")
        print("  admin (or use the Render Shell for the PostgreSQL service) to run:")
        print()
        print(f"    ALTER USER {connected_user} CREATEDB;")
        print(f"    CREATE DATABASE {TARGET_DB} OWNER {connected_user};")
        print()
        print("  Then re-run this script to verify and grant privileges.")
        cur.close(); conn.close(); sys.exit(1)

    # ── Step 2: List existing databases (read-only) ───────────────────────────
    cur.execute(
        "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"
    )
    existing_dbs = [row[0] for row in cur.fetchall()]
    print(f"[*] Databases on this server: {existing_dbs}")

    # ── Step 3: Confirm CareConnect database is present ───────────────────────
    if PROTECTED_DB in existing_dbs:
        print(f"[✓] Protected database '{PROTECTED_DB}' found — it will NOT be modified.")
    else:
        print(f"[!] WARNING: '{PROTECTED_DB}' not found on this server.")
        print(f"             Verify you are connected to the correct PostgreSQL instance.")
        # Do not abort — the user may be on a test server without CareConnect.

    # ── Step 4: Check if target already exists (idempotent) ───────────────────
    if TARGET_DB in existing_dbs:
        print(f"\n[✓] Database '{TARGET_DB}' already exists. Nothing to create.")
        print(f"[*] You can proceed directly to: alembic upgrade head && python seed.py")
        cur.close(); conn.close()
        return

    # ── Step 5: Create the new logical database ───────────────────────────────
    print(f"\n[*] Creating database '{TARGET_DB}'...")
    try:
        cur.execute(f'CREATE DATABASE "{TARGET_DB}";')
        print(f"[✓] Database '{TARGET_DB}' created successfully.")
    except psycopg2.errors.DuplicateDatabase:
        print(f"[✓] Database '{TARGET_DB}' already exists (concurrent create — safe).")
    except Exception as e:
        err_msg = str(e).replace(parsed.password or "", "***") if parsed.password else str(e)
        print(f"ERROR: CREATE DATABASE failed: {err_msg}")
        cur.close(); conn.close(); sys.exit(1)

    # ── Step 6: Grant privileges to current user ──────────────────────────────
    cur.execute("SELECT current_user;")
    current_user = cur.fetchone()[0]
    try:
        cur.execute(f'GRANT ALL PRIVILEGES ON DATABASE "{TARGET_DB}" TO "{current_user}";')
        print(f"[✓] ALL PRIVILEGES granted to '{current_user}' on '{TARGET_DB}'.")
    except Exception as e:
        err_msg = str(e).replace(parsed.password or "", "***") if parsed.password else str(e)
        print(f"[!] GRANT failed (user may already be owner — usually safe): {err_msg}")

    cur.close()
    conn.close()

    print(f"\n[✓] '{TARGET_DB}' is ready on the existing PostgreSQL server.")
    print(f"[*] CareConnect database '{PROTECTED_DB}' was NOT modified.")
    print()
    print(f"[*] Next steps:")
    print(f"    1. In Render → college-issue-backend → Environment, set:")
    print(f"       DATABASE_URL = postgresql+psycopg2://{connected_user}:***@{connected_host}:5432/{TARGET_DB}?sslmode=require")
    print(f"    2. Deploy the backend (Alembic runs automatically in the build command).")
    print(f"    3. In the Render Shell, run:  python seed.py")
    print()


if __name__ == "__main__":
    main()
