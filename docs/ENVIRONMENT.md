# ReForge Environment Variables

Complete reference for all environment variables used across the project.

---

## Backend Variables

Set these in the Render dashboard under the Web Service's **Environment** tab, or in a `.env` file at the project root for local development.

### Required

| Variable | Example | Description |
|---|---|---|
| `GROQ_API_KEY` | `gsk_abc123...` | Groq API authentication key. Get one at [console.groq.com](https://console.groq.com). |

### CORS

| Variable | Default | Example | Description |
|---|---|---|---|
| `NEW_FRONTEND_URL` | `""` | `https://reforge-frontend.onrender.com` | Frontend URL for CORS allow-list |

Empty strings are excluded from the CORS allow-list automatically.

### Pipeline Configuration

| Variable | Default | Options | Description |
|---|---|---|---|
| `AGENT_TIMEOUT_SECONDS` | `25` | Any positive number | Maximum seconds for agentic pipeline before returning failure envelope. |

### Logging

| Variable | Default | Options | Description |
|---|---|---|---|
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` | Python logging verbosity |

### AI Model

| Variable | Default | Description |
|---|---|---|
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model ID. Override to use a different model. |

---

## Frontend Variables

Set these in the Render dashboard under the Static Site's **Environment** tab, or in a `.env` file inside `frontend/` for local development.

### Build-Time Variables

These are embedded into the JavaScript bundle during `vite build`. Changing them requires a rebuild.

| Variable | Example | Description |
|---|---|---|
| `VITE_API_URL` | `https://reforge-api.onrender.com` | Backend API base URL. No trailing slash. |

**Behavior:**

| `VITE_API_URL` value | Frontend behavior |
|---|---|
| Set to valid URL | Sends real API calls to backend |
| Not set / empty | Runs in offline demo mode with heuristic analysis |

> **Important:** If you change `VITE_API_URL` after the initial build, you must trigger a manual redeploy of the Static Site. The value is baked into the JS at build time and cannot be changed at runtime.

---

## Local Development Setup

### Backend (.env at project root)

```env
GROQ_API_KEY=gsk_your_key_here
LOG_LEVEL=DEBUG
```

### Frontend (.env inside frontend/)

```env
VITE_API_URL=http://localhost:8000
```

For local development, point `VITE_API_URL` at your local backend (`http://localhost:8000`). The backend's CORS config already includes `http://localhost:5173` (Vite dev server port).

---

## Render Dashboard Checklist

### Backend Web Service

- [ ] `GROQ_API_KEY` set
- [ ] `NEW_FRONTEND_URL` set to frontend URL
- [ ] `AGENT_TIMEOUT_SECONDS` set (or leave default `25`)

### Frontend Static Site

- [ ] `VITE_API_URL` set to backend URL (no trailing slash)
- [ ] Redeployed after any env var change

---

## Security Notes

- Never commit `.env` files — they are gitignored
- Never log `GROQ_API_KEY` values
- Rotate `GROQ_API_KEY` if accidentally exposed
- Use Render's environment variable UI (not command line) to avoid shell history leaks
