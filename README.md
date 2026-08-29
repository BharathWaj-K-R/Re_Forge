<p align="center">
  <img src="https://img.shields.io/badge/python-3.10%2B-blue" alt="Python 3.10+" />
  <img src="https://img.shields.io/badge/FastAPI-0.111.0-009688" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Groq-Llama%203.3%2070B-orange" alt="Groq AI" />
  <img src="https://img.shields.io/badge/frontend-HTML%2FCSS%2FJS-46E3B0" alt="HTML CSS JavaScript frontend" />
  <img src="https://img.shields.io/badge/deployed-Render-46E3B0" alt="Deployed on Render" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
  <a href="https://re-forge.onrender.com/">
    <img src="https://img.shields.io/badge/Live-Demo-46E3B0" alt="Live Demo" />
  </a>
</p>

# ReForge

> **Live:** [re-forge.onrender.com](https://re-forge.onrender.com/) | **API:** [reforge-api.onrender.com](https://reforge-api.onrender.com/)

**AI-powered code review platform with a multi-agent validation pipeline.**

ReForge analyzes source code using large language models and returns structured feedback on bugs, security vulnerabilities, performance issues, and best practices. Unlike most AI review tools that pass LLM output through unchecked, ReForge treats every AI finding as a draft — each one passes through a validation agent, and the quality score is computed deterministically.

---

## Features

- **Multi-agent validation pipeline** — Every finding is validated before it reaches the user
- **Deterministic scoring** — Same findings always produce the same score, independent of model self-assessment
- **4 review categories** — Bugs, Security, Performance, Best Practices
- **Failure-safe review handling** — Timeout or pipeline failure returns a clear failure envelope instead of crashing the API
- **Clean static frontend** — Plain HTML, CSS, and vanilla JavaScript without React/Vite runtime dependencies
- **Modern UI** — Glass-morphism design and responsive layout
- **Production-ready deployment configuration** — Render deployment with health checks, CORS, and IaC configuration

---

## Architecture

```
Client (Browser)
      │
      ▼
FastAPI Backend
      │
      ▼
Agentic Pipeline
(Planner + Specialists + Critic)
      │
      ▼
Validation Layer
(bug / security / performance / best_practice)
      │
      ▼
Score Engine (deterministic)
      │
      ▼
JSON Response
```

Two independent services on Render:

| Service | Type | Tech |
|---|---|---|
| **Backend** | Web Service | FastAPI + Groq Llama 3.3 70B |
| **Frontend** | Static Site | HTML + CSS + vanilla JavaScript |

See [Architecture Docs](docs/ARCHITECTURE.md) for the full system design.

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js/npm only if using the optional Render-compatible `npm run build` copy script
- [Groq API key](https://console.groq.com)

### 1. Clone

```bash
git clone https://github.com/BharathWaj-K-R/Re_Forge.git
cd Re_Forge
```

### 2. Backend

```bash
python -m venv venv
.\\venv\\Scripts\\activate          # Windows
# source venv/bin/activate       # Linux/macOS

pip install -r requirements.txt

# Create .env at project root
echo GROQ_API_KEY=your_key_here > .env

uvicorn backend.main:app --reload
```

Backend runs at [http://localhost:8000](http://localhost:8000). API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Frontend

```bash
cd frontend

# Optional: edit js/config.js if your backend is not https://reforge-api.onrender.com
python3 -m http.server 5173
```

Frontend runs at [http://localhost:5173](http://localhost:5173).

See [Development Guide](docs/DEVELOPMENT.md) for full setup instructions and troubleshooting.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Welcome message |
| `GET` | `/health` | Health check |
| `GET` | `/test-ai` | Verify Groq connection |
| `POST` | `/review` | Submit code for review |
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Sign in |
| `GET` | `/auth/me` | Get current user |
| `GET` | `/history` | List current user's saved reviews |
| `GET` | `/history/{review_id}` | Get a saved review |
| `DELETE` | `/history` | Clear current user's history |
| `DELETE` | `/account` | Delete current user's account |

**Example:**

```bash
curl -X POST http://localhost:8000/review \
  -H "Content-Type: application/json" \
  -d '{"language": "python", "code": "def divide(a, b):\n    return a / b"}'
```

See [API Reference](docs/API_REFERENCE.md) for the endpoint documentation.

---

## Scoring Methodology

The score is computed deterministically — the LLM never assigns scores.

| Severity | Deduction |
|---|---|
| Critical | -30 |
| High | -20 |
| Medium | -10 |
| Low | -5 |

Starting score: **100** | Floor: **0**

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3, FastAPI, Pydantic, Uvicorn |
| **AI** | Groq API, Llama 3.3 70B Versatile |
| **Frontend** | HTML, CSS, vanilla JavaScript |
| **Database** | SQLAlchemy + PostgreSQL in production / SQLite locally |
| **Deployment** | Render (Web Service + Static Site) |
| **IaC** | render.yaml |

---

## Project Structure

```
Re_Forge/
├── backend/                      # Python/FastAPI backend
│   ├── main.py                   # FastAPI app + CORS + startup
│   ├── config.py                 # Environment/pipeline configuration
│   ├── routes.py                 # Review/history/account routes
│   ├── auth.py                   # JWT authentication
│   ├── database.py               # SQLAlchemy connection and startup schema checks
│   ├── models.py                 # User and Review database models
│   ├── ai.py                     # Groq LLM client
│   └── review_pipeline/          # Multi-agent review pipeline
│       ├── pipeline.py           # Planner → specialists → critic → validation → score
│       ├── prompts.py            # Agent prompts
│       ├── validators.py         # Finding normalization
│       ├── score.py              # Deterministic scoring
│       └── tools.py              # AST, secret, and loop checks
│
├── frontend/                     # Static frontend
│   ├── index.html                # HTML shell and app sections
│   ├── css/styles.css            # Plain CSS
│   ├── js/                       # Vanilla JavaScript modules
│   └── assets/reforgelogo.png    # Logo asset
│
├── docs/                         # Project documentation
├── .env.example                  # Environment variable template
├── requirements.txt              # Python dependencies
├── render.yaml                   # Render backend service configuration
└── .gitignore
```

---

## Deployment

ReForge deploys on Render as two independent services:

1. **Backend Web Service** — configured by `render.yaml`
2. **Frontend Static Site** — configured from `frontend/`

See [Deployment Guide](docs/DEPLOYMENT.md) for step-by-step instructions.

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | Current system design and review pipeline |
| [API Reference](docs/API_REFERENCE.md) | Current endpoint documentation |
| [Deployment](docs/DEPLOYMENT.md) | Render deployment guide |
| [Development](docs/DEVELOPMENT.md) | Local development setup |
| [Environment](docs/ENVIRONMENT.md) | Environment variables reference |
| [Security](docs/SECURITY.md) | Security posture and known limitations |

---

## Design Principles

1. **Deterministic scoring** — The model generates findings; code computes scores
2. **Validation before output** — AI findings pass through a validator before display
3. **Failure-safe runtime** — Pipeline timeout/failure returns an explicit failure envelope
4. **Separation of concerns** — Each module has one clear responsibility
5. **Two-service architecture** — Frontend and backend deploy independently

---

## Contributing

Issues and pull requests are welcome.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

Released under the [MIT License](LICENSE).

---

## Author

**Bharathwaj KR**
AI & Full Stack Developer
