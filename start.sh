#!/usr/bin/env bash
# ============================================================
#  College Issue Management System - Linux/macOS Startup Script
# ============================================================
#  Usage: bash start.sh
#  Requirements: Python 3, Node.js, PostgreSQL (for production)
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# PIDs for background processes
BACKEND_PID=""
FRONTEND_PID=""

# ---- Helpers -----------------------------------------------
green()  { echo -e "\033[0;32m  [OK]   $*\033[0m"; }
yellow() { echo -e "\033[0;33m  [WARN] $*\033[0m"; }
red()    { echo -e "\033[0;31m  [FAIL] $*\033[0m"; }
header() { echo -e "\n\033[0;36m==> $*\033[0m"; }

# ---- Cleanup on Ctrl+C -------------------------------------
cleanup() {
    echo ""
    echo -e "\033[0;33m  Stopping services...\033[0m"
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" && green "Backend stopped (PID $BACKEND_PID)"
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" && green "Frontend stopped (PID $FRONTEND_PID)"
    fi
    echo -e "\033[0;36m  Goodbye!\033[0m"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ---- Banner ------------------------------------------------
echo ""
echo "  ========================================="
echo "   College Issue Management System"
echo "   Startup Script (Linux / macOS)"
echo "  ========================================="

# ---- 1. Check Python ---------------------------------------
header "Checking Python"
PYTHON_CMD=""
for candidate in python3 python; do
    if command -v "$candidate" &>/dev/null; then
        ver=$("$candidate" --version 2>&1)
        if echo "$ver" | grep -q "Python 3"; then
            PYTHON_CMD="$candidate"
            green "Found: $candidate ($ver)"
            break
        fi
    fi
done
if [ -z "$PYTHON_CMD" ]; then
    red "Python 3 not found. Install via your package manager and retry."
    exit 1
fi

# ---- 2. Check Node.js --------------------------------------
header "Checking Node.js"
CUSTOM_NODE_DIR="$HOME/tools/node"
NODE_CMD=""
NPM_CMD=""

if [ -x "$CUSTOM_NODE_DIR/node" ]; then
    NODE_CMD="$CUSTOM_NODE_DIR/node"
    NPM_CMD="$CUSTOM_NODE_DIR/npm"
    ver=$("$NODE_CMD" --version 2>&1)
    green "Found custom node: $NODE_CMD ($ver)"
    export PATH="$CUSTOM_NODE_DIR:$PATH"
elif command -v node &>/dev/null; then
    NODE_CMD="node"
    NPM_CMD="npm"
    ver=$(node --version 2>&1)
    green "Found system node: $ver"
else
    red "Node.js not found. Install from https://nodejs.org or place it at ~/tools/node/"
    exit 1
fi

# ---- 3. Check PostgreSQL -----------------------------------
header "Checking PostgreSQL"
PG_UP=false
if command -v pg_isready &>/dev/null && pg_isready -h localhost -p 5432 -q 2>/dev/null; then
    PG_UP=true
    green "PostgreSQL is reachable on port 5432"
elif (echo > /dev/tcp/localhost/5432) 2>/dev/null; then
    PG_UP=true
    green "PostgreSQL is reachable on port 5432"
else
    yellow "PostgreSQL is NOT reachable on port 5432."
    yellow "Falling back to SQLite for testing."
    yellow "For production, start PostgreSQL and ensure DB 'college_tickets' exists."
fi

# ---- 4. Load / Set DATABASE_URL ----------------------------
header "Loading environment"
ENV_FILE="$SCRIPT_DIR/.env"
DATABASE_URL=""
if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC2046
    export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs) 2>/dev/null || true
    green "Loaded .env"
fi
if [ -z "${DATABASE_URL:-}" ]; then
    if [ "$PG_UP" = true ]; then
        DATABASE_URL="postgresql://postgres:postgres@localhost:5432/college_tickets"
    else
        DATABASE_URL="sqlite:///./college_tickets.db"
        yellow "Using SQLite fallback: $DATABASE_URL"
    fi
fi
export DATABASE_URL
green "DATABASE_URL = $DATABASE_URL"

# ---- 5. Backend setup -------------------------------------
header "Setting up Backend"
cd "$BACKEND_DIR"

VENV_PATH="$BACKEND_DIR/venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "  Creating virtual environment..."
    "$PYTHON_CMD" -m venv venv
    green "Virtual environment created"
else
    green "Virtual environment already exists"
fi

# shellcheck disable=SC1091
source "$VENV_PATH/bin/activate"

echo "  Installing Python dependencies..."
pip install -r requirements.txt --quiet
green "Dependencies installed"

# ---- 6. Seed Database -------------------------------------
header "Seeding Database"
if [ -f "$BACKEND_DIR/seed.py" ]; then
    echo "  Running seed.py..."
    "$PYTHON_CMD" seed.py
    green "Database seeded"
else
    yellow "seed.py not found — skipping seed step"
fi

# ---- 7. Start Backend (background) -------------------------
header "Starting Backend Server"
(
    source "$VENV_PATH/bin/activate"
    export DATABASE_URL
    cd "$BACKEND_DIR"
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 2>&1 | \
        sed 's/^/  [Backend]  /'
) &
BACKEND_PID=$!
green "Backend started (PID $BACKEND_PID)"

# Give the backend a moment to start
sleep 3

# ---- 8. Frontend setup ------------------------------------
header "Setting up Frontend"
cd "$FRONTEND_DIR"

echo "  Installing npm dependencies..."
"$NPM_CMD" install --silent
green "Frontend dependencies installed"

# ---- 9. Start Frontend (background) -----------------------
header "Starting Frontend Dev Server"
(
    export PATH
    cd "$FRONTEND_DIR"
    "$NPM_CMD" run dev 2>&1 | sed 's/^/  [Frontend] /'
) &
FRONTEND_PID=$!
green "Frontend started (PID $FRONTEND_PID)"

# ---- 10. Print URLs ----------------------------------------
sleep 2
echo ""
echo "  ========================================="
echo -e "  \033[0;32m College Issue Management System is UP!\033[0m"
echo "  ========================================="
echo ""
echo "   Backend API  : http://localhost:8000"
echo "   Frontend App : http://localhost:5174"
echo "   API Docs     : http://localhost:8000/docs"
echo "   Redoc        : http://localhost:8000/redoc"
echo ""
echo "  Press Ctrl+C to stop all services."

# ---- 11. Wait for background processes --------------------
wait $BACKEND_PID $FRONTEND_PID
