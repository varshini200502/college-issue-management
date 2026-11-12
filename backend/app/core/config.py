import os
from typing import List

# Manually load backend/.env if present (for local development)
_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_env_path = os.path.join(_backend_dir, ".env")
if os.path.exists(_env_path):
    with open(_env_path, "r", encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                _k = _k.strip()
                _v = _v.strip().strip('"').strip("'")
                if _k not in os.environ:
                    os.environ[_k] = _v

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Centralized College Issue and Ticket Management System")
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = os.getenv("API_V1_STR", "/api")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", 
        "college_issue_management_super_secure_jwt_secret_key_2026_prod_auth"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))  # 24 hours

    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    PROJECT_ROOT: str = os.path.dirname(BASE_DIR)

    # Database URL
    _raw_db_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/college_issue_db"
    )
    
    # Render and cloud PostgreSQL URLs start with 'postgres://' or bare 'postgresql://'
    # In SQLAlchemy 2.0+, bare 'postgresql://' defaults to the psycopg (v3) driver, which
    # fails with ModuleNotFoundError: No module named 'psycopg' if only psycopg2-binary is installed.
    # We explicitly map both 'postgres://' and bare 'postgresql://' to 'postgresql+psycopg2://'
    if _raw_db_url.startswith("postgres://"):
        _raw_db_url = _raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif _raw_db_url.startswith("postgresql://") and not _raw_db_url.startswith("postgresql+"):
        _raw_db_url = _raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    DATABASE_URL: str = _raw_db_url

    # CORS Configuration
    # Local dev defaults and Vercel production domains
    _default_origins = [
        "https://college-issue-management-murex.vercel.app",
        "https://college-issue-management.vercel.app",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    _custom_cors: str = os.getenv("CORS_ORIGINS", os.getenv("BACKEND_CORS_ORIGINS", ""))
    if _custom_cors:
        # Merge custom origins (e.g. Vercel deployment URL) with dev origins, stripping whitespace and trailing slashes
        parsed_custom = [orig.strip().rstrip("/") for orig in _custom_cors.split(",") if orig.strip()]
        # Remove any wildcard if credentials are enabled
        BACKEND_CORS_ORIGINS: List[str] = list(set(_default_origins + parsed_custom))
    else:
        BACKEND_CORS_ORIGINS: List[str] = _default_origins

    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))

settings = Settings()
