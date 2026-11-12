import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Determine dialect
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# Production safety checks: Disallow SQLite or localhost fallback when running in production
is_production = settings.ENVIRONMENT.lower() == "production" or os.getenv("RENDER", "").lower() == "true"
if is_production and is_sqlite:
    raise RuntimeError(
        "FATAL PRODUCTION ERROR: SQLite is configured but is prohibited in production. "
        "A managed PostgreSQL connection string must be provided via the DATABASE_URL environment variable."
    )

is_localhost = "@localhost" in settings.DATABASE_URL or "@127.0.0.1" in settings.DATABASE_URL
if is_production and is_localhost:
    raise RuntimeError(
        "FATAL PRODUCTION ERROR: DATABASE_URL is pointing to localhost in production. "
        "A managed cloud PostgreSQL connection string must be provided via the DATABASE_URL environment variable."
    )

connect_args = {"check_same_thread": False} if is_sqlite else {}

engine_kwargs = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
    "echo": False
}

# Connection recycling for cloud-hosted PostgreSQL instances
if not is_sqlite:
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
