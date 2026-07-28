# ReForge Deployment Guide

ReForge uses two independent Render services:

| Service | Type | Root Directory | Purpose |
|---|---|---|---|
| `reforge-api` | Web Service | `/` (repo root) | Python/FastAPI backend API |
| `reforge-frontend` | Static Site | `frontend/` | Static HTML/CSS/JavaScript UI |

The backend and frontend deploy separately. The backend deployment contract is unchanged.

---

## Backend Web Service

The backend is defined in `render.yaml`:

```yaml
services:
  - type: web
    name: reforge-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
```

Required Render environment variables:

| Key | Required | Notes |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for LLM reviews |
| `NEW_FRONTEND_URL` | Recommended | Exact frontend origin for CORS |
| `DATABASE_URL` | Production recommended | PostgreSQL connection string |
| `JWT_SECRET` | Production required | Strong JWT signing secret |
| `AGENT_TIMEOUT_SECONDS` | Optional | Defaults to backend config |
| `LOG_LEVEL` | Optional | Defaults to backend config |

---

## Frontend Static Site

The frontend now uses plain static files in `frontend/`.

### Option A: Keep existing Render build settings

Use this if your Render Static Site is already configured like the old Vite app:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

The current `npm run build` script does not compile React or Vite. It only copies `index.html`, `css/`, `js/`, and `assets/` into `dist/`.

### Option B: Simplify to no-build static hosting

Use this after confirming the static frontend works:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `echo "No build needed"` |
| Publish Directory | `.` |

---

## Local frontend testing

```bash
cd frontend
python3 -m http.server 5173
```

Open <http://localhost:5173>.

The backend CORS configuration already allows `http://localhost:5173`. Do not use `file://` to open the page because browser CORS behavior may block API calls.

---

## CORS after deployment

After the frontend is live:

1. Copy the frontend Static Site URL, for example `https://re-forge.onrender.com`.
2. Open the backend Web Service in Render.
3. Set `NEW_FRONTEND_URL` to that exact origin.
4. Redeploy the backend if Render does not do it automatically.

---

## Health check

```bash
curl https://reforge-api.onrender.com/health
```

Expected response:

```json
{ "status": "healthy", "service": "ReForge API", "version": "1.0.0" }
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Frontend API calls fail with CORS errors | Frontend origin not allowed | Set backend `NEW_FRONTEND_URL` to the frontend origin |
| Backend returns 500 | Missing or invalid backend env vars | Check `GROQ_API_KEY`, `DATABASE_URL`, and logs |
| Static Site build fails | Wrong root/build settings | Use `frontend`, `npm install && npm run build`, and `dist` |
| Frontend points to wrong backend | `frontend/js/config.js` has wrong `API_URL` | Update `API_URL` and redeploy |
