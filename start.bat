@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo  Centralized College Issue and Ticket Management System
echo  Windows Command Prompt Startup Script (PostgreSQL)
echo ========================================================
echo.

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

:: 1. Check and Configure Environment File
if not exist "%BACKEND_DIR%\.env" (
    if exist "%ROOT_DIR%.env.example" (
        echo [*] Creating backend\.env from .env.example...
        copy "%ROOT_DIR%.env.example" "%BACKEND_DIR%\.env" >nul
    )
)

:: 2. Find Python 3.11+
echo [*] Checking Python environment...
set "PYTHON_CMD="
if exist "C:\Python311\python.exe" (
    set "PYTHON_CMD=C:\Python311\python.exe"
) else (
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=python"
    ) else (
        echo [ERROR] Python was not found on your system.
        echo Please install Python 3.11+ and ensure it is added to your PATH.
        exit /b 1
    )
)
echo [OK] Using Python: %PYTHON_CMD%

:: 3. Find Node.js and npm
echo [*] Checking Node.js environment...
set "NODE_PATH_BIN=C:\Users\ADMIN\.gemini\antigravity\scratch\tools\node"
if exist "%NODE_PATH_BIN%\node.exe" (
    set "PATH=%NODE_PATH_BIN%;!PATH!"
    echo [OK] Added tool node to PATH: %NODE_PATH_BIN%
)
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Node.js was not found on your system.
    echo Please install Node.js 18+ and ensure it is added to your PATH.
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set "NODE_VER=%%v"
echo [OK] Using Node.js: !NODE_VER!

:: 4. Detect and Check PostgreSQL Service Dynamically
echo [*] Checking PostgreSQL service...
set "PG_SERVICE="

:: Dynamically detect any registered PostgreSQL Windows service
for /f "tokens=2 delims=: " %%s in ('sc.exe query state^= all 2^>nul ^| findstr /i "SERVICE_NAME" ^| findstr /i "postgres"') do (
    if not defined PG_SERVICE set "PG_SERVICE=%%s"
)

:: Fallback check on standard PostgreSQL service names
if not defined PG_SERVICE (
    for %%n in (postgresql-x64-18 postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql-x64-14 postgresql-x64-13 postgresql) do (
        if not defined PG_SERVICE (
            sc.exe query %%n >nul 2>&1
            if !errorlevel! equ 0 set "PG_SERVICE=%%n"
        )
    )
)

if defined PG_SERVICE (
    echo [OK] Detected PostgreSQL service: !PG_SERVICE!
    sc.exe query "!PG_SERVICE!" | findstr /i "RUNNING" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] PostgreSQL service is RUNNING.
    ) else (
        echo [INFO] PostgreSQL service is stopped. Attempting to start service...
        net start "!PG_SERVICE!" >nul 2>&1
        timeout /t 2 /nobreak >nul
        sc.exe query "!PG_SERVICE!" | findstr /i "RUNNING" >nul 2>&1
        if !errorlevel! equ 0 (
            echo [OK] Service '!PG_SERVICE!' started successfully.
        ) else (
            echo [WARN] Could not automatically start service '!PG_SERVICE!'.
            echo Please ensure the service is running in Windows Services: services.msc
        )
    )
) else (
    echo [WARN] No PostgreSQL Windows service detected automatically.
    echo Proceeding to test direct connection on port 5432...
)

:: 5. Verify PostgreSQL Connectivity & Database
echo [*] Verifying PostgreSQL connection and application database...
cd /d "%BACKEND_DIR%"
"%PYTHON_CMD%" create_db.py
if !errorlevel! neq 0 (
    echo.
    echo ========================================================
    echo  [ERROR] PostgreSQL Connection Failed
    echo ========================================================
    echo  Could not connect to PostgreSQL on port 5432.
    echo.
    echo  If PostgreSQL is NOT installed on this machine:
    echo    1. Download PostgreSQL 18 or 17 installer from:
    echo       https://www.postgresql.org/download/windows/
    echo    2. Install PostgreSQL Server and Command Line Tools.
    echo    3. Keep default port 5432 and remember your admin password.
    echo    4. Update backend\.env with your password:
    echo       DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/college_issue_db"
    echo.
    echo  If PostgreSQL IS installed:
    echo    1. Ensure the Windows service is running in services.msc.
    echo    2. Check that port 5432 is listening.
    echo    3. Verify credentials in backend\.env:
    findstr /i "DATABASE_URL" .env
    echo ========================================================
    echo.
    echo Stopping startup. The application requires PostgreSQL.
    cd /d "%ROOT_DIR%"
    exit /b 1
)
echo [OK] PostgreSQL database 'college_issue_db' is connected and ready.

:: 6. Check Frontend Dependencies
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [*] Installing frontend dependencies via npm install...
    cd /d "%FRONTEND_DIR%"
    call npm install
    cd /d "%BACKEND_DIR%"
)

:: 7. Run Alembic Database Migrations
echo [*] Running database migrations (alembic upgrade head)...
cd /d "%BACKEND_DIR%"
"%PYTHON_CMD%" -m alembic upgrade head
if !errorlevel! neq 0 (
    echo [ERROR] Database migrations failed.
    cd /d "%ROOT_DIR%"
    exit /b 1
)
echo [OK] Database schema up to date.

:: 8. Run Seeder (Master Data and Login Accounts)
echo [*] Initializing database master data and login accounts...
"%PYTHON_CMD%" seed.py
if !errorlevel! neq 0 (
    echo [ERROR] Seeding process failed.
    cd /d "%ROOT_DIR%"
    exit /b 1
)
echo [OK] Database master data and login accounts verified.

:: 9. Start Backend in separate window
echo [*] Starting FastAPI backend on http://localhost:8000 ...
start "College Issue Backend (FastAPI)" cmd /k "cd /d ""%BACKEND_DIR%"" && ""%PYTHON_CMD%"" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: 10. Start Frontend in separate window
echo [*] Starting React+Vite frontend on http://localhost:5174 ...
start "College Issue Frontend (Vite)" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

cd /d "%ROOT_DIR%"

echo.
echo ========================================================
echo  All services launched successfully!
echo ========================================================
echo  Frontend Portal:       http://localhost:5174
echo  Backend API Docs:      http://localhost:8000/docs
echo  Backend Health Check:  http://localhost:8000/health
echo ========================================================
echo  Local Development Personas:
echo    - Principal:  principal@college.edu      (Read-Only Supervisor)
echo    - IT Admin:   it.admin@college.edu       (IT Queue)
echo    - Finance:    finance.admin@college.edu  (Finance Queue)
echo    - Student:    student.alex@college.edu
echo    - Faculty:    faculty.sarah@college.edu
echo  (Default development passwords configured in seed.py / local .env)
echo ========================================================
echo.
pause
