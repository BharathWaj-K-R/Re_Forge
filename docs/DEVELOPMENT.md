# ReForge Local Development Guide

Step-by-step guide to running ReForge locally.

---

## Prerequisites

| Tool | Version | Purpose | Required |
|---|---|---|---|
| Python | 3.10+ | Backend runtime and local static server | Yes |
| Node.js/npm | 18+/9+ | Optional frontend copy-only build compatibility | Optional |
| Git | any | Version control | Yes |

---

## Backend setup

```bash
python -m venv venv
source venv/bin/activate       # Linux/macOS
# .\venv\Scripts\activate    # Windows PowerShell
pip install -r requirements.txt
```

Create `.env` at the repo root:

```env
GROQ_API_KEY=gsk_your_key_here
LOG_LEVEL=DEBUG
```

Start the backend:

```bash
uvicorn backend.main:app --reload --port 8000
```

Verify:

```bash
curl http://localhost:8000/health
```

Interactive API docs are available at <http://localhost:8000/docs>.

---

## Frontend setup

The frontend is plain HTML, CSS, and vanilla JavaScript in `frontend/`.

If you are testing against a local backend, edit `frontend/js/config.js` and set:

```js
window.REFORGE_CONFIG = {
  API_URL: "http://localhost:8000",
};
```

Serve the frontend:

```bash
cd frontend
python3 -m http.server 5173
```

Open <http://localhost:5173>.

Do not open `index.html` with `file://`, because CORS can block backend calls.

---

## Optional frontend build compatibility

Render may still be configured with the old Static Site build command. This remains supported:

```bash
cd frontend
npm run build
```

The build script only copies static files into `frontend/dist/`.

---

## Project structure

```text
Re_Forge/
├── backend/                      # Python/FastAPI backend
│   ├── main.py                   # FastAPI app + CORS
│   ├── config.py                 # Environment config
│   ├── routes.py                 # Review/history/account routes
│   ├── auth.py                   # JWT/auth/OTP routes
│   ├── database.py               # SQLAlchemy connection
│   ├── models.py                 # User and Review models
│   └── review_pipeline/          # Multi-agent review pipeline
├── frontend/                     # Static HTML/CSS/JS frontend
│   ├── index.html                # App markup
│   ├── css/styles.css            # Plain CSS
│   ├── js/config.js              # API URL config
│   ├── js/api.js                 # Fetch wrapper
│   ├── js/auth.js                # Auth/session helpers
│   ├── js/review.js              # Review submission/rendering
│   ├── js/history.js             # Review history helpers
│   ├── js/app.js                 # UI event wiring/navigation
│   ├── assets/reforgelogo.png    # Logo asset
│   ├── package.json              # Optional copy-only build script
│   └── README.md                 # Frontend notes
├── docs/                         # Documentation
├── requirements.txt              # Python dependencies
└── render.yaml                   # Backend Render service
```

---

## Testing the API directly

```bash
curl -X POST http://localhost:8000/review \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "def hello():\n    print(\"hello\")"
  }'
```

---

## Common checks

```bash
python -m compileall backend
cd frontend && npm run build
```
