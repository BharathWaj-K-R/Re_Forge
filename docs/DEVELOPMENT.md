# ReForge Local Development Guide

Step-by-step guide to running ReForge locally.

---

## Prerequisites

| Tool | Version | Purpose | Required |
|---|---|---|---|
| Python | 3.10+ | Backend runtime | Yes |
| Node.js | 18+ | Frontend build | Yes |
| npm | 9+ | Frontend package manager | Yes (or Bun) |
| Bun | latest | Alternative to npm | Optional |
| Git | any | Version control | Yes |

---

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Bharathwaj-K-R/Re_Forge.git
cd Re_Forge
```

### 2. Backend Setup

**Create a virtual environment:**

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux / macOS
python -m venv venv
source venv/bin/activate
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

**Configure environment:**

Create a `.env` file in the project root:

```env
GROQ_API_KEY=gsk_your_key_here
LOG_LEVEL=DEBUG
```

Get a Groq API key at [console.groq.com](https://console.groq.com).

**Start the backend:**

```bash
uvicorn backend.main:app --reload --port 8000
```

The `--reload` flag enables auto-restart on code changes.

**Verify:**

```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy","service":"ReForge API","version":"1.0.0"}
```

Interactive API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend Setup

**Install dependencies:**

```bash
cd frontend
npm install
```

**Configure environment:**

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:8000
```

**Start the dev server:**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
Re_Forge/
├── backend/                      # Backend Python package
│   ├── main.py                   # FastAPI app + CORS
│   ├── config.py                 # Centralized env var loading
│   ├── routes.py                 # HTTP endpoints
│   ├── ai.py                     # Groq LLM client
│   ├── auth.py                   # JWT authentication
│   ├── database.py               # SQLAlchemy connection
│   ├── models.py                 # DB models (User, Review)
│   └── review_pipeline/          # Review pipeline
│       ├── pipeline.py           # Unified pipeline (entry point)
│       ├── prompts.py            # Agent system prompts
│       ├── validators.py         # Review finding validators
│       ├── score.py              # Deterministic scoring
│       └── tools.py              # Deterministic analysis tools
│
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── styles.css            # Tailwind theme
│   │   ├── components/
│   │   │   ├── Landing.tsx       # Main page
│   │   │   ├── DashboardPage.tsx # Authenticated review dashboard
│   │   │   ├── AuthPage.tsx      # Login/register
│   │   │   ├── HistoryPage.tsx   # Review history
│   │   │   ├── HeroOrb.tsx       # 3D orb
│   │   │   ├── MiniCards.tsx     # 3D cards
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx   # Auth state management
│   │   ├── hooks/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                         # Documentation
├── .env                          # Backend secrets (gitignored)
├── requirements.txt              # Python dependencies
├── render.yaml                   # Render IaC
└── .gitignore
```

---

## Development Workflow

### Testing a Review Locally

1. Start backend: `uvicorn backend.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173`
4. Paste code → select language → click "Run Review"
5. Results appear in the right panel

### Testing the API Directly

```bash
curl -X POST http://localhost:8000/review \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "def hello():\n    print(\"hello\")\n    eval(input())"
  }'
```

### Testing Without a Groq Key

If `GROQ_API_KEY` is not set, the backend returns a zero-score error envelope. The frontend falls back to mock analysis.

---

## Frontend Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

---

## Backend Commands

| Command | Description |
|---|---|
| `uvicorn backend.main:app --reload` | Dev server with auto-reload |
| `uvicorn backend.main:app --host 0.0.0.0 --port 8000` | Production-like start |
| `pip install -r requirements.txt` | Install/update dependencies |

---

## Debugging

### Backend Logs

Set `LOG_LEVEL=DEBUG` in `.env` for verbose output. Key things to look for:

- `Review request for language=...` — review request received
- `Agentic review complete: llm_calls=X score=XX` — final score
- `Groq Error: ...` — LLM API failures

### Frontend Debugging

Open DevTools (F12) → Console:

- "Connected to your backend." — `VITE_API_URL` is set correctly
- "Running in offline demo mode." — `VITE_API_URL` is not set
- "Live API failed (error)" — API call failed, showing mock results

### CORS Errors

If you see CORS errors in the browser console:

1. Check that the backend is running
2. Check that the frontend origin is in the CORS allow-list
3. For local dev, `http://localhost:5173` is already allowed

---

## Common Issues

| Problem | Solution |
|---|---|
| `ModuleNotFoundError: No module named 'app'` | Run uvicorn from the project root, not inside `app/` |
| `GROQ_API_KEY not found` | Check `.env` file exists at project root |
| Port 8000 in use | Use `--port 8001` or kill the existing process |
| Port 5173 in use | Vite auto-increments to next available port |
| CORS error | Verify frontend URL is in backend's CORS origins |
| Frontend shows mock results | Set `VITE_API_URL` and rebuild |
| Build fails with OOM | Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096` |
