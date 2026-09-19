# ReForge Deployment Guide

ReForge uses two independent Render services:

| Service | Type | Root Directory | Purpose |
|---|---|---|---|
| reforge-api | Web Service | / | FastAPI backend |
| reforge-frontend | Static Site | frontend/ | Static HTML/CSS/JavaScript UI |

## Backend Web Service

Start command:

uvicorn backend.main:app --host 0.0.0.0 --port $PORT

The API has no database startup requirement and no authentication requirement.

Required environment variables:

| Key | Required | Notes |
|---|---|---|
| GROQ_API_KEY | Yes for reviews | LLM provider key |
| NEW_FRONTEND_URL | Recommended | Exact frontend origin for CORS |
| AGENT_TIMEOUT_SECONDS | Optional | Review timeout |
| LOG_LEVEL | Optional | Logging level |

There is intentionally no DATABASE_URL or JWT_SECRET requirement.

## Frontend Static Site

Use:

| Setting | Value |
|---|---|
| Root Directory | frontend |
| Build Command | echo "No build needed" |
| Publish Directory | . |

## CORS

Set NEW_FRONTEND_URL on the API to the exact frontend origin.

## Health check

Render uses GET /health.

Expected response:

{"status":"healthy","service":"ReForge API","version":"1.1.0","mode":"public"}

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| API fails to start | Python dependency or import failure | Inspect the first fatal traceback |
| Review returns a failure envelope | LLM/pipeline dependency failed | Check API logs and LLM configuration |
| Frontend API calls fail with CORS errors | Frontend origin not allowed | Set NEW_FRONTEND_URL |
| Frontend points to wrong API | Wrong frontend/js/config.js | Update API_URL |
| Render reports no open port | Process exited before binding | Inspect the earliest fatal traceback |

The database is deliberately not part of the deployment path.
