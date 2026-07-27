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
| `NEW_FRONTEND_URL` | `""` | `https://re-forge.onrender.com,https://reforge-preview.onrender.com` | Frontend origin(s) for the CORS allow-list. Accepts a single origin or a comma-separated list. |

Empty strings are excluded from the CORS allow-list automatically. Whatever origin the frontend is actually served from (check the browser address bar) must be listed here **exactly** (scheme + host, no trailing slash) or every API request from that frontend will fail with a CORS error, which browsers surface to JavaScript as a generic "Failed to fetch".

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

## Frontend Configuration

The static frontend does not require Render environment variables or Vite build-time variables.

Configure the backend URL in `frontend/js/config.js`:

```js
window.REFORGE_CONFIG = {
  API_URL: "https://reforge-api.onrender.com",
};
```

For local development against a local backend, temporarily set `API_URL` to `http://localhost:8000`.

## Local Development Setup

### Backend (.env at project root)

```env
GROQ_API_KEY=gsk_your_key_here
LOG_LEVEL=DEBUG
```

### Frontend (`frontend/js/config.js`)

```js
window.REFORGE_CONFIG = {
  API_URL: "http://localhost:8000",
};
```

The backend CORS config already includes `http://localhost:5173` for local static serving.

---

## Render Dashboard Checklist

### Backend Web Service

- [ ] `GROQ_API_KEY` set
- [ ] `NEW_FRONTEND_URL` set to frontend URL
- [ ] `AGENT_TIMEOUT_SECONDS` set (or leave default `25`)

### Frontend Static Site

- [ ] `frontend/js/config.js` points to the correct backend URL
- [ ] Backend `NEW_FRONTEND_URL` matches the deployed frontend origin

---

## Security Notes

- Never commit `.env` files — they are gitignored
- Never log `GROQ_API_KEY` values
- Rotate `GROQ_API_KEY` if accidentally exposed
- Use Render's environment variable UI (not command line) to avoid shell history leaks
