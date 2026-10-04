# CoBuy Deployment Guide (Netlify + Render)

This guide walks you through deploying **CoBuy** with the **Frontend on Netlify** and the **Backend & Database on Render** (free tier).

---

## Architecture Overview

- **Frontend (Netlify):** React 19 + Vite SPA (hosted on Netlify CDN with free SSL and automatic Git deploys).
- **Backend (Render):** Python Flask REST API + `mlxtend` + `gunicorn` (hosted on Render free web service).
- **Database (Render Disk / Cloud):** SQLite (`database.db`) persisted via Render disk volume or cloud database.

---

## Step 1: Set Up Free Cloud Database on Turso

Because Render's free tier uses an ephemeral (temporary) disk that resets when the service sleeps, we use **Turso** (free cloud SQLite/libSQL) to persist users, datasets, and stores permanently.

1. Go to [turso.tech](https://turso.tech) and sign up / log in with your GitHub account.
2. In the Turso dashboard, click **Create Database**:
   - **Database Name:** `cobuy-db` (or any name you prefer)
   - Choose a region closest to your users.
3. Click into your new database:
   - Copy your **Database URL** (e.g. `libsql://cobuy-db-yourname.turso.io`).
   - Click **Generate Token** and copy the **Auth Token**.

---

## Step 2: Deploy Backend to Render (Free)

1. Sign up / Log in to [render.com](https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository (`Co-Buy`).
4. Configure the service settings:
   - **Name:** `cobuy-api` (or any name you prefer)
   - **Region:** Choose closest to your users (e.g., Singapore or US East)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn --workers=2 --threads=4 --timeout=120 --bind=0.0.0.0:$PORT app:app`
   - **Instance Type:** `Free`
5. **Add Environment Variables** (under *Advanced*):
   - `FLASK_ENV` = `production`
   - `PYTHON_VERSION` = `3.12.0`
   - `SECRET_KEY` = *(click "Generate" or type a random string)*
   - `TURSO_DATABASE_URL` = *(paste your Turso Database URL from Step 1)*
   - `TURSO_AUTH_TOKEN` = *(paste your Turso Auth Token from Step 1)*
6. Click **Create Web Service** (or **Manual Deploy** if your service is already created).
7. Once deployment finishes, Render will provide your public backend URL, for example:
   `https://cobuy-api.onrender.com`

> **Note:** Test your backend in your browser by opening `https://cobuy-api.onrender.com/healthz`. If it responds with `{"status":"healthy"}`, your backend is live and connected to Turso!


---

## Step 2: Deploy Frontend to Netlify

1. Sign up / Log in to [netlify.com](https://netlify.com).
2. Click **Add new site** > **Import an existing project**.
3. Connect to your GitHub account and select your `Co-Buy` repository.
4. Netlify will automatically detect the settings from `netlify.toml`:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
5. **Add the Backend URL Environment Variable:**
   - Under **Environment variables**, click **Add a variable**:
     - **Key:** `VITE_API_BASE`
     - **Value:** `https://your-backend-name.onrender.com/api` *(replace with your actual Render URL from Step 1, including `/api`)*
6. Click **Deploy Co-Buy**.
7. In ~1 minute, your site will be live at `https://your-site-name.netlify.app`!

---

## Step 3: Verify Everything Works

1. Open your Netlify URL in your browser.
2. Log in using your existing admin credentials or register a new business account.
3. Test uploading a dataset (`.csv` or `.xlsx`) and viewing the Market Insights dashboard.
4. Open the **Export Report** modal and test downloading the executive PDF report.

---

## Local Development (Unchanged)

Running locally continues to work exactly as before:
```bash
# Terminal 1 - Backend
cd backend
.venv\Scripts\python.exe app.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```
Local development automatically defaults to `http://localhost:5000/api`.
