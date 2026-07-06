<p align="center">
  <img src="https://img.shields.io/badge/python-3.10%2B-blue" alt="Python 3.10+" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Groq-Llama%203.3%2070B-orange" alt="Groq AI" />
  <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF" alt="Vite 8" />
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
- **Graceful degradation** — Timeout returns honest failure envelope; frontend falls back to mock analysis
- **Dual frontend support** — Old and new frontends run side-by-side on the same backend
- **Modern UI** — Glass-morphism design, Three.js 3D animations, responsive layout
- **Production-ready** — Deployed on Render with health checks, CORS, and IaC configuration

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
(3-6 LLMs + Tools)
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
| **Frontend** | Static Site | Vite 8 + React 19 + Tailwind v4 + Three.js |

See [Architecture Docs](docs/ARCHITECTURE.md) for the full system design.

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Groq API key](https://console.groq.com)

### 1. Clone

```bash
git clone https://github.com/BharathWaj-K-R/Re_Forge.git
cd Re_Forge
```

### 2. Backend

```bash
python -m venv venv
.\venv\Scripts\activate          # Windows
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

npm install

# Create .env inside frontend/
echo VITE_API_URL=http://localhost:8000 > .env

npm run dev
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

**Example:**

```bash
curl -X POST http://localhost:8000/review \
  -H "Content-Type: application/json" \
  -d '{"language": "python", "code": "def divide(a, b):\n    return a / b"}'
```

**Response:**

```json
{
  "success": true,
  "language": "python",
  "overall_score": 70,
  "summary": "Potential division by zero detected.",
  "reviews": {
    "bug": [{ "severity": "High", "title": "Division by Zero", ... }],
    "security": [],
    "performance": [],
    "best_practice": [{ "severity": "Low", "title": "Missing Docstring", ... }]
  }
}
```

See [API Reference](docs/API_REFERENCE.md) for the full endpoint documentation.

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
| **Frontend** | React 19, TypeScript, Vite 8 |
| **Styling** | Tailwind CSS v4, custom design tokens |
| **3D Graphics** | Three.js (HeroOrb, MiniCards) |
| **UI Components** | shadcn/ui (Radix primitives) |
| **Deployment** | Render (Web Service + Static Site) |
| **IaC** | render.yaml |

---

## Project Structure

```
Re_Forge/
├── backend/                      # Backend
│   ├── main.py                   # FastAPI app + CORS
│   ├── config.py                 # Centralized env config
│   ├── routes.py                 # HTTP endpoints
│   ├── ai.py                     # Groq LLM client
│   └── review_pipeline/          # Review pipeline
│       ├── pipeline.py           # Unified agentic pipeline
│       ├── prompts.py            # Agent system prompts
│       ├── validators.py         # Unified validator
│       ├── score.py              # Deterministic scoring
│       └── tools.py              # AST, secrets, loop tools
│
├── frontend/                     # Frontend
│   ├── src/
│   │   ├── main.tsx              # Entry point
│   │   ├── styles.css            # Tailwind theme
│   │   ├── components/
│   │   │   ├── Landing.tsx       # Main page
│   │   │   ├── HeroOrb.tsx       # 3D orb
│   │   │   ├── MiniCards.tsx     # 3D cards
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── hooks/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md
│   ├── ENVIRONMENT.md
│   └── SECURITY.md
├── .env                          # Secrets (gitignored)
├── requirements.txt              # Python deps
├── render.yaml                   # Render IaC
└── .gitignore
```

---

## Deployment

ReForge deploys on Render as two independent services:

1. **Backend Web Service** — auto-deploys from `render.yaml`
2. **Frontend Static Site** — configured in Render dashboard

See [Deployment Guide](docs/DEPLOYMENT.md) for step-by-step instructions.

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, pipeline modes |
| [API Reference](docs/API_REFERENCE.md) | Complete endpoint documentation |
| [Deployment](docs/DEPLOYMENT.md) | Render deployment guide |
| [Development](docs/DEVELOPMENT.md) | Local development setup |
| [Environment](docs/ENVIRONMENT.md) | Environment variables reference |
| [Security](docs/SECURITY.md) | Security audit and policy |

---

## Design Principles

1. **Deterministic scoring** — The model generates findings; logic computes scores
2. **Validation before output** — Every AI finding passes through a validator
3. **Graceful degradation** — Agentic → error envelope → mock analysis
4. **Separation of concerns** — Each module has one responsibility
5. **Reproducibility** — Same input produces the same output, every time
6. **Two-service architecture** — Frontend and backend deploy independently

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
