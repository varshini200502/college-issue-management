"""
create_college_db.py
====================
Creates the `college_issue_db` logical database on the existing Render
PostgreSQL server WITHOUT touching careconnect_db_p0bs or any CareConnect data.

USAGE (run once from Render Shell or locally with the postgres:// admin URL):

    DATABASE_ADMIN_URL="postgresql://careconnect_user:<password>@<host>:5432/careconnect_db_p0bs" \
        python create_college_db.py

The script will:
  1. Connect to the existing server using the admin/superuser URL you supply.
  2. List existing databases (read-only inspection).
  3. Confirm careconnect_db_p0bs exists and is UNTOUCHED.
  4. Check whether college_issue_db already exists.
  5. Create college_issue_db only if it does not exist.
  6. Grant CONNECT privileges to the existing user.
  7. Exit without modifying any existing data.

NEVER run Alembic or seed.py against careconnect_db_p0bs.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

TARGET_DB = "college_issue_db"
PROTECTED_DB = "careconnect_db_p0bs"

def main():
    admin_url = os.getenv("DATABASE_ADMIN_URL")
    if not admin_url:
        print("ERROR: Set the DATABASE_ADMIN_URL environment variable to your")
        print("       Render PostgreSQL admin connection URL before running this script.")
        print()
        print("  Example:")
        print("  DATABASE_ADMIN_URL='postgresql://careconnect_user:<pwd>@<host>:5432/careconnect_db_p0bs'")
        print("  python create_college_db.py")
        sys.exit(1)

    # Normalize postgres:// -> postgresql://
    if admin_url.startswith("postgres://"):
        admin_url = admin_url.replace("postgres://", "postgresql://", 1)

    print(f"\n[*] Connecting to PostgreSQL server...")
    print(f"[*] Target new database : {TARGET_DB}")
    print(f"[*] Protected database  : {PROTECTED_DB} (will NOT be modified)\n")

    try:
        conn = psycopg2.connect(admin_url)
    except Exception as e:
        print(f"ERROR: Could not connect to PostgreSQL: {e}")
        sys.exit(1)

    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    # 1. List all existing databases (read-only)
    cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;")
    existing_dbs = [row[0] for row in cur.fetchall()]
    print(f"[*] Existing databases on this server: {existing_dbs}")

    # 2. Confirm CareConnect is present and untouched
    if PROTECTED_DB in existing_dbs:
        print(f"[✓] Protected database '{PROTECTED_DB}' found and will NOT be modified.")
    else:
        print(f"[!] Warning: '{PROTECTED_DB}' not found — verify you're on the correct server.")

    # 3. Check whether college_issue_db already exists
    if TARGET_DB in existing_dbs:
        print(f"\n[✓] Database '{TARGET_DB}' already exists. No action needed.")
        cur.close()
        conn.close()
        return

    # 4. Safety gate: refuse to run against CareConnect
    connected_db = conn.get_dsn_parameters().get("dbname", "")
    if connected_db == PROTECTED_DB and TARGET_DB == PROTECTED_DB:
        print("CRITICAL: Refusing to create/modify CareConnect database. Exiting.")
        sys.exit(1)

    # 5. Create the new logical database
    print(f"\n[*] Creating database '{TARGET_DB}'...")
    try:
        cur.execute(f'CREATE DATABASE "{TARGET_DB}";')
        print(f"[✓] Database '{TARGET_DB}' created successfully.")
    except psycopg2.errors.DuplicateDatabase:
        print(f"[✓] Database '{TARGET_DB}' already exists (race condition — safe to continue).")
    except Exception as e:
        print(f"ERROR: Failed to create database: {e}")
        print()
        print("This usually means your user lacks CREATEDB privileges.")
        print("Ask your Render PostgreSQL admin to run:")
        print(f"  ALTER USER <your_user> CREATEDB;")
        print(f"  CREATE DATABASE {TARGET_DB} OWNER <your_user>;")
        cur.close()
        conn.close()
        sys.exit(1)

    # 6. Get the current user to grant privileges
    cur.execute("SELECT current_user;")
    current_user = cur.fetchone()[0]
    try:
        cur.execute(f'GRANT ALL PRIVILEGES ON DATABASE "{TARGET_DB}" TO "{current_user}";')
        print(f"[✓] Privileges granted to '{current_user}' on '{TARGET_DB}'.")
    except Exception as e:
        print(f"[!] Could not grant privileges (may already be owner): {e}")

    cur.close()
    conn.close()

    print(f"\n[✓] Done. '{TARGET_DB}' is ready.")
    print(f"[*] Next step: Set DATABASE_URL in Render to point to '{TARGET_DB}' and run:")
    print(f"    alembic upgrade head")
    print(f"    python seed.py")
    print(f"\n[*] CareConnect database '{PROTECTED_DB}' was NOT modified.\n")

if __name__ == "__main__":
    main()
