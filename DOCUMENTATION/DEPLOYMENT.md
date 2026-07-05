# ReForge Deployment Guide

ReForge uses a two-service architecture on Render:

| Service | Type | Root Directory | Purpose |
|---|---|---|---|
| `reforge-api` | Web Service | `/` (repo root) | Backend API |
| `reforge-frontend` | Static Site | `reforge-ai-review-main/` | Frontend UI |

Both services are independent and deploy separately.

---

## Backend (Web Service)

### Automatic Deployment via render.yaml

The backend is defined as Infrastructure as Code in `render.yaml`:

```yaml
services:
  - type: web
    name: reforge-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
```

### Setup Steps

1. **Connect your GitHub repo** to Render
2. Render auto-detects `render.yaml` and creates the Web Service
3. Set environment variables in the Render dashboard (see [ENVIRONMENT.md](ENVIRONMENT.md))
4. Click **Deploy**

### Manual Configuration

If not using `render.yaml`, configure manually:

| Setting | Value |
|---|---|
| **Name** | `reforge-api` |
| **Type** | Web Service |
| **Environment** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/health` |

### Required Environment Variables

| Key | Required | Example |
|---|---|---|
| `GROQ_API_KEY` | Yes | `gsk_...` |
| `FRONTEND_URL` | Recommended | `https://reforge-client.onrender.com` |
| `NEW_FRONTEND_URL` | Recommended | `https://reforge-frontend.onrender.com` |
| `AGENT_MODE` | Optional | `classic` (default) or `agentic` |
| `AGENT_TIMEOUT_SECONDS` | Optional | `25` (default) |
| `LOG_LEVEL` | Optional | `INFO` (default) |

See [ENVIRONMENT.md](ENVIRONMENT.md) for full details.

---

## Frontend (Static Site)

### Setup Steps

1. In Render dashboard: **New** → **Static Site**
2. Connect the same GitHub repo (`Re_Forge`)
3. Configure with these settings:

| Setting | Value |
|---|---|
| **Name** | `reforge-frontend` |
| **Root Directory** | `reforge-ai-review-main` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |
| **Branch** | `main` |

4. Add environment variable:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://reforge-api.onrender.com` |

> **Important:** `VITE_API_URL` is embedded at build time. If you change it, you must redeploy the Static Site (Manual Deploy → Deploy latest commit).

5. Click **Create Static Site**

### Post-Deployment: Update Backend CORS

After the frontend is live:

1. Copy the Static Site URL (e.g., `https://reforge-frontend.onrender.com`)
2. Go to the backend Web Service → **Environment**
3. Set `NEW_FRONTEND_URL` to that URL
4. Save → backend redeploys automatically

---

## Old Frontend (Legacy)

The old frontend (`client/`) remains untouched and deployable. Its Render Static Site uses:

| Setting | Value |
|---|---|
| **Root Directory** | `client` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

Both frontends can run side-by-side, pointing at the same backend.

---

## Deployment Architecture

```
                    ┌─────────────────────┐
                    │   GitHub Repository  │
                    │   BharathWaj-K-R/   │
                    │   Re_Forge           │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Render Auto-Deploy │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                  │
    ┌─────────▼─────────┐           ┌───────────▼───────────┐
    │  Web Service       │           │  Static Site           │
    │  reforge-api       │           │  reforge-frontend      │
    │                    │           │                        │
    │  Python / FastAPI   │           │  Node / Vite build     │
    │  uvicorn start     │           │  dist/ published       │
    │                    │           │                        │
    │  Env: GROQ_API_KEY │           │  Env: VITE_API_URL     │
    │       FRONTEND_URL │           │       → baked into JS  │
    │       NEW_FRONTEND │           │                        │
    └────────────────────┘           └────────────────────────┘
```

---

## Redeployment

### Backend
- Push to `main` → auto-deploys
- Or: Render dashboard → **Manual Deploy** → **Deploy latest commit**

### Frontend
- Push to `main` → auto-deploys (if Static Site is connected)
- If you change `VITE_API_URL`: must trigger manual redeploy after saving the env var

---

## Monitoring

### Health Check

```bash
curl https://reforge-api.onrender.com/health
```

Expected response:

```json
{ "status": "healthy", "service": "ReForge API", "version": "1.0.0" }
```

### Logs

View in Render dashboard under each service's **Logs** tab. Key log messages:

| Log Pattern | Meaning |
|---|---|
| `Review request: mode=classic` | Classic pipeline handling request |
| `Classic review: mode=classic score=XX` | Classic review completed |
| `Starting agentic review` | Agentic pipeline started |
| `Agentic review complete: llm_calls=N score=XX` | Agentic review finished |
| `Agentic pipeline timed out` | Fell back to classic |
| `Agentic pipeline failed` | Fell back to classic |

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Frontend shows "Live API failed" | CORS not configured | Set `NEW_FRONTEND_URL` in backend env |
| Frontend shows "offline demo mode" | `VITE_API_URL` not set | Set env var and redeploy Static Site |
| Backend returns 500 | Groq API key missing | Set `GROQ_API_KEY` in backend env |
| Build fails on Static Site | Wrong root directory | Set Root Directory to `reforge-ai-review-main` |
| CORS errors in browser console | Frontend URL not in allow-list | Add URL to `NEW_FRONTEND_URL` |
