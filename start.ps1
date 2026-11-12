# ============================================================
#  College Issue Management System - Windows PowerShell Startup
# ============================================================
#  Usage: .\start.ps1
#  Requirements: Python 3.11, Node.js, PostgreSQL (for production)
# ============================================================

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

# ---- Helpers -----------------------------------------------
function Write-Header($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "  [WARN] $msg" -ForegroundColor Yellow
}

function Write-Fail($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
}

# ---- Banner ------------------------------------------------
Write-Host ""
Write-Host "  =========================================" -ForegroundColor Blue
Write-Host "   College Issue Management System" -ForegroundColor White
Write-Host "   Startup Script (Windows PowerShell)" -ForegroundColor White
Write-Host "  =========================================" -ForegroundColor Blue

# ---- 1. Check Python ---------------------------------------
Write-Header "Checking Python"
$PythonCmd = $null
foreach ($candidate in @("C:\Python311\python.exe", "python", "python3")) {
    try {
        $ver = & $candidate --version 2>&1
        if ($ver -match "Python 3") {
            $PythonCmd = $candidate
            Write-Ok "Found: $candidate ($ver)"
            break
        }
    } catch {}
}
if (-not $PythonCmd) {
    Write-Fail "Python 3 not found. Install from https://python.org and retry."
    exit 1
}

# ---- 2. Check Node.js --------------------------------------
Write-Header "Checking Node.js"
$CustomNode = "C:\Users\ADMIN\.gemini\antigravity\scratch\tools\node\node.exe"
$NodeCmd = $null
$NpmCmd  = $null
if (Test-Path $CustomNode) {
    $NodeDir = Split-Path $CustomNode -Parent
    $NpmCmd  = Join-Path $NodeDir "npm.cmd"
    if (-not (Test-Path $NpmCmd)) { $NpmCmd = Join-Path $NodeDir "npm" }
    $NodeCmd = $CustomNode
    $ver = & $NodeCmd --version 2>&1
    Write-Ok "Found custom node: $CustomNode ($ver)"
} else {
    try {
        $ver = & node --version 2>&1
        $NodeCmd = "node"
        $NpmCmd  = "npm"
        Write-Ok "Found system node: $ver"
    } catch {
        Write-Fail "Node.js not found at $CustomNode or in system PATH."
        Write-Fail "Install from https://nodejs.org or place node.exe at the custom path."
        exit 1
    }
}

# ---- 3. Check PostgreSQL ------------------------------------
Write-Header "Checking PostgreSQL"
$PgUp = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("localhost", 5432)
    $tcp.Close()
    $PgUp = $true
    Write-Ok "PostgreSQL service is active and listening on port 5432"
} catch {
    Write-Fail "PostgreSQL is NOT reachable on port 5432."
    Write-Host "  Please ensure the PostgreSQL Windows service ('postgresql-x64-18') is started." -ForegroundColor Yellow
    exit 1
}

# ---- 4. Load DATABASE_URL -----------------------------------
Write-Header "Loading environment"
$BackendEnv = Join-Path $BackendDir ".env"
$DatabaseUrl = $null
if (Test-Path $BackendEnv) {
    Get-Content $BackendEnv | ForEach-Object {
        if ($_ -match "^\s*DATABASE_URL\s*=\s*(.+)$") {
            $DatabaseUrl = $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
    Write-Ok "Loaded configuration from backend\.env"
}
if (-not $DatabaseUrl) {
    Write-Fail "DATABASE_URL not found in backend\.env. Please configure PostgreSQL connection."
    exit 1
}
Write-Ok "DATABASE_URL = $DatabaseUrl"
$env:DATABASE_URL = $DatabaseUrl

# ---- 5. Backend setup -------------------------------------
Write-Header "Setting up Backend"
Set-Location $BackendDir

$VenvPath = Join-Path $BackendDir "venv"
if (-not (Test-Path $VenvPath)) {
    Write-Host "  Creating virtual environment..."
    & $PythonCmd -m venv venv
    Write-Ok "Virtual environment created"
} else {
    Write-Ok "Virtual environment already exists"
}

$ActivateScript = Join-Path $VenvPath "Scripts\Activate.ps1"
Write-Host "  Activating virtual environment..."
& $ActivateScript

Write-Host "  Installing Python dependencies..."
pip install -r requirements.txt --quiet
Write-Ok "Dependencies installed"

# ---- 6. Seed Database -------------------------------------
Write-Header "Seeding Database"
$SeedScript = Join-Path $BackendDir "seed.py"
if (Test-Path $SeedScript) {
    Write-Host "  Running seed.py..."
    & $PythonCmd seed.py
    Write-Ok "Database seeded"
} else {
    Write-Warn "seed.py not found — skipping seed step"
}

# ---- 7. Start Backend (background Job) --------------------
Write-Header "Starting Backend Server"
$BackendJob = Start-Job -Name "CIMS-Backend" -ScriptBlock {
    param($dir, $dbUrl)
    $env:DATABASE_URL = $dbUrl
    Set-Location $dir
    & ".\venv\Scripts\Activate.ps1"
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList $BackendDir, $DatabaseUrl
Write-Ok "Backend job started (Job ID: $($BackendJob.Id))"

# Give the backend a moment to start
Start-Sleep -Seconds 3

# ---- 8. Frontend setup ------------------------------------
Write-Header "Setting up Frontend"
Set-Location $FrontendDir

# Temporarily prepend custom node dir to PATH for npm
$OrigPath = $env:PATH
$NodeDir  = Split-Path $NodeCmd -Parent
$env:PATH = "$NodeDir;$OrigPath"

Write-Host "  Installing npm dependencies..."
& $NpmCmd install --silent
Write-Ok "Frontend dependencies installed"

# ---- 9. Start Frontend (background Job) -------------------
Write-Header "Starting Frontend Dev Server"
$FrontendJob = Start-Job -Name "CIMS-Frontend" -ScriptBlock {
    param($dir, $nodeDir)
    $env:PATH = "$nodeDir;$env:PATH"
    Set-Location $dir
    npm run dev
} -ArgumentList $FrontendDir, $NodeDir
Write-Ok "Frontend job started (Job ID: $($FrontendJob.Id))"

# ---- 10. Print URLs ----------------------------------------
Start-Sleep -Seconds 2
Write-Host ""
Write-Host "  =========================================" -ForegroundColor Green
Write-Host "   College Issue Management System is UP!" -ForegroundColor Green
Write-Host "  =========================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Backend API  : http://localhost:8000"       -ForegroundColor White
Write-Host "   Frontend App : http://localhost:5174"       -ForegroundColor White
Write-Host "   API Docs     : http://localhost:8000/docs"  -ForegroundColor White
Write-Host "   Redoc        : http://localhost:8000/redoc" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to stop all services." -ForegroundColor Gray

# ---- 11. Stream logs until interrupted --------------------
try {
    while ($true) {
        Start-Sleep -Seconds 5

        $backendState  = (Get-Job -Id $BackendJob.Id).State
        $frontendState = (Get-Job -Id $FrontendJob.Id).State

        # Print any new backend output
        $backendOut = Receive-Job -Id $BackendJob.Id -Keep 2>&1
        if ($backendOut) {
            foreach ($line in ($backendOut -split "`n" | Select-Object -Last 5)) {
                if ($line) { Write-Host "  [Backend]  $line" -ForegroundColor DarkGray }
            }
        }

        if ($backendState -eq "Failed") {
            Write-Warn "Backend job failed. Check logs with: Receive-Job -Id $($BackendJob.Id)"
        }
        if ($frontendState -eq "Failed") {
            Write-Warn "Frontend job failed. Check logs with: Receive-Job -Id $($FrontendJob.Id)"
        }
    }
} finally {
    Write-Host ""
    Write-Host "  Stopping services..." -ForegroundColor Yellow
    Stop-Job  -Id $BackendJob.Id  -ErrorAction SilentlyContinue
    Stop-Job  -Id $FrontendJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $BackendJob.Id  -ErrorAction SilentlyContinue
    Remove-Job -Id $FrontendJob.Id -ErrorAction SilentlyContinue
    $env:PATH = $OrigPath
    Write-Host "  Stopped. Goodbye!" -ForegroundColor Cyan
}
