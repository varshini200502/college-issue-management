import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_application_db():
    host = os.getenv("PGHOST", "localhost")
    port = int(os.getenv("PGPORT", "5432"))
    user = os.getenv("PGUSER", "postgres")
    password = os.getenv("PGPASSWORD", "postgres")
    dbname = os.getenv("PGDATABASE", "college_issue_db")

    print(f"[*] Connecting to PostgreSQL at {host}:{port} as user '{user}'...")
    try:
        conn = psycopg2.connect(host=host, port=port, user=user, password=password, dbname="postgres")
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        cur.execute("SELECT 1 FROM pg_database WHERE datname=%s;", (dbname,))
        exists = cur.fetchone()

        if not exists:
            cur.execute(f'CREATE DATABASE "{dbname}" OWNER "{user}";')
            print(f"[✔] Database '{dbname}' created successfully with owner '{user}'.")
        else:
            print(f"[*] Database '{dbname}' already exists.")

        cur.close()
        conn.close()

        # Test direct connection to application database
        app_conn = psycopg2.connect(host=host, port=port, user=user, password=password, dbname=dbname)
        app_cur = app_conn.cursor()
        app_cur.execute('SELECT current_database(), current_user;')
        db_name, user_name = app_cur.fetchone()
        print(f"[✔] Successfully connected to database: {db_name} as user: {user_name}")
        app_conn.close()

    except Exception as e:
        print(f"[!] Database setup note: {e}")

if __name__ == '__main__':
    create_application_db()
