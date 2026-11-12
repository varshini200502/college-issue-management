# 🚀 Production Deployment Guide

## Centralized College Issue and Ticket Management System

This guide provides end-to-end instructions for deploying the system using the target architecture:
- **Source Code**: GitHub (Private Repository)
- **Backend & Database**: Render (FastAPI Web Service + Managed PostgreSQL Database)
- **Frontend**: Vercel (React + Vite Single-Page Application)

---

## 📋 Architectural Overview

```
                        ┌────────────────────────┐
                        │     Private GitHub     │
                        │       Repository       │
                        └──────────┬─────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
                 ▼                                   ▼
      ┌──────────────────────┐           ┌──────────────────────┐
      │   Vercel Frontend    │           │    Render Backend    │
      │   (React 18 + Vite)  │           │   (FastAPI Python)   │
      └──────────┬───────────┘           └──────────┬───────────┘
                 │                                   │
                 │   HTTPS API Requests              ▼
                 │   (Bearer JWT + CORS) ┌──────────────────────┐
                 └──────────────────────►│  Render PostgreSQL   │
                                         │      (Database)      │
                                         └──────────────────────┘
```

---

## 🔒 Pre-Flight Security Checklist

1. **Verify `.gitignore`**:
   Ensure `backend/.env`, `frontend/.env`, `uploads/`, and build artifacts are strictly ignored before committing.
2. **Never commit real secrets**:
   Use `.env.example` templates for documentation; real JWT secrets and database passwords must only be supplied via Render and Vercel dashboard environment settings.
3. **Demo accounts**:
   Demo credentials and auto-fill buttons are automatically disabled in production builds.

---

## Part 1: GitHub Repository Setup

1. Open a terminal in the project root directory:
   ```bash
   cd college-issue-management
   ```
2. Initialize Git (if not already initialized):
   ```bash
   git init
   git branch -M main
   ```
3. Stage and commit all audited project files:
   ```bash
   git add .
   git commit -m "feat: production readiness audit, deployment configurations and security hardening"
   ```
4. Link to your private GitHub repository and push:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

---

## Part 2: Render Deployment (Database & Backend)

### Method A: Blueprint Deployment using `render.yaml` (Recommended)

1. Log in to [Render](https://dashboard.render.com/).
2. Click **Blueprints** in the top navigation, then click **New Blueprint Instance**.
3. Connect your private GitHub repository.
4. Render will read `render.yaml` and configure:
   - Managed PostgreSQL database (`college-issue-db`)
   - FastAPI web service (`college-issue-backend`)
5. Click **Apply**.
6. Once deployed, note down:
   - Your backend service URL (e.g., `https://college-issue-backend.onrender.com`)
   - Update `CORS_ORIGINS` in Render environment variables once your Vercel frontend domain is known.

---

### Method B: Manual Render Setup via Dashboard

#### 1. Create PostgreSQL Database
1. In Render Dashboard, click **New +** -> **PostgreSQL**.
2. Settings:
   - **Name**: `college-issue-db`
   - **Database**: `college_issue_db`
   - **User**: `college_admin`
   - **Region**: Choose closest region (e.g., Oregon, Frankfurt, Singapore)
   - **Plan**: Free or Starter
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (if deploying backend in the same region) or **External Database URL**.

#### 2. Create FastAPI Web Service
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select your GitHub repository.
3. Configure settings:
   - **Name**: `college-issue-backend`
   - **Region**: Same region as your database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && alembic upgrade head
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Health Check Path**: `/health`

4. Add Environment Variables:
   | Variable | Value / Description |
   |---|---|
   | `DATABASE_URL` | Selected from Database or pasted connection string |
   | `SECRET_KEY` | Generate with `openssl rand -hex 32` |
   | `ALGORITHM` | `HS256` |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` |
   | `PROJECT_NAME` | `Centralized College Issue and Ticket Management System` |
   | `API_V1_STR` | `/api` |
   | `ENVIRONMENT` | `production` |
   | `CORS_ORIGINS` | `https://your-app-name.vercel.app` (comma-separated for multiples) |
   | `SEED_SAMPLE_TICKETS` | `false` |

5. Click **Create Web Service**.

#### 3. Initial Seed Master Data (One-Time Execution)
After the first successful build and migration:
Open the **Shell** tab on your Render web service and run:
```bash
python seed.py
```
This initializes the 3 roles, 8 campus departments, and categories. Because `SEED_SAMPLE_TICKETS="false"`, no unnecessary mock tickets will be generated.

---

## Part 3: Vercel Deployment (Frontend)

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** -> **Project**.
3. Import your private GitHub repository.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`** (Critical!)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Configure Environment Variables:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_BASE_URL` | `https://college-issue-backend.onrender.com` | Your deployed Render backend URL |
   | `VITE_ENABLE_DEMO_ACCOUNTS` | `false` | Keeps login UI clean and production-secure |
6. Click **Deploy**.

---

## Part 4: Connect Vercel & Render (CORS Synchronization)

1. Copy your live Vercel production domain (e.g. `https://college-issue-system.vercel.app`).
2. Go back to your Render backend web service -> **Environment**.
3. Update the `CORS_ORIGINS` variable:
   ```env
   CORS_ORIGINS=https://college-issue-system.vercel.app
   ```
4. Render will automatically redeploy the backend with the new allowed origin.

---

## Part 5: Post-Deployment Verification

1. **Backend Health Check**:
   Visit `https://<your-render-backend>.onrender.com/health` in your browser.
   Expected response:
   ```json
   {
     "status": "healthy",
     "system": "Centralized College Issue and Ticket Management System",
     "database_connected": true,
     "environment": "production"
   }
   ```

2. **Frontend Routing & Refresh Test**:
   - Open your Vercel URL in a browser.
   - Navigate to `/login/reporter`.
   - Press **F5 / Refresh**. The page must render without a 404 error (handled by `frontend/vercel.json`).

3. **Authentication & RBAC Test**:
   - Log in as an authorized user.
   - Verify JWT token is received and stored in browser session.
   - Test Principal account: Verify access to `/principal/dashboard` and confirm that issue resolution buttons are hidden and backend returns HTTP 403 Forbidden on mutation attempts.
