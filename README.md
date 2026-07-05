<p align="center">
  <img src="https://img.shields.io/badge/python-3.10%2B-blue" alt="Python 3.10+" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Groq-Llama%203.3%2070B-orange" alt="Groq AI" />
  <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF" alt="Vite 8" />
  <img src="https://img.shields.io/badge/deployed-Render-46E3B0" alt="Deployed on Render" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
</p>

# ReForge

**AI-powered code review platform with a multi-agent validation pipeline.**

ReForge analyzes source code using large language models and returns structured feedback on bugs, security vulnerabilities, performance issues, and best practices. Unlike most AI review tools that pass LLM output through unchecked, ReForge treats every AI finding as a draft — each one passes through a validation agent, and the quality score is computed deterministically.

---

## Features

- **Multi-agent validation pipeline** — Every finding is validated before it reaches the user
- **Two pipeline modes** — Classic (fast, single LLM call) or Agentic (deep, multi-agent with tools)
- **Deterministic scoring** — Same findings always produce the same score, independent of model self-assessment
- **4 review categories** — Bugs, Security, Performance, Best Practices
- **Graceful degradation** — Agentic falls back to classic on timeout; frontend falls back to mock analysis
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
Orchestrator (mode check)
      │
  ┌───┴────┐
  ▼        ▼
Classic  Agentic
(1 LLM)  (3-6 LLMs + Tools)
  │        │
  └───┬────┘
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

See [Architecture Docs](DOCUMENTATION/ARCHITECTURE.md) for the full system design.

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

uvicorn app.main:app --reload
```

Backend runs at [http://localhost:8000](http://localhost:8000). API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Frontend

```bash
cd reforge-ai-review-main

npm install

# Create .env inside reforge-ai-review-main/
echo VITE_API_URL=http://localhost:8000 > .env

npm run dev
```

Frontend runs at [http://localhost:5173](http://localhost:5173).

See [Development Guide](DOCUMENTATION/DEVELOPMENT.md) for full setup instructions and troubleshooting.

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

See [API Reference](DOCUMENTATION/API_REFERENCE.md) for the full endpoint documentation.

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
├── app/                          # Backend
│   ├── main.py                   # FastAPI app + CORS
│   ├── config.py                 # Centralized env config
│   ├── routes.py                 # HTTP endpoints
│   ├── ai.py                     # Groq LLM client
│   └── agents/                   # Review pipeline
│       ├── orchestrator.py       # Mode dispatcher
│       ├── agentic_orchestrator.py # Multi-agent pipeline
│       ├── prompts.py            # Agent system prompts
│       ├── bug.py                # Bug validator
│       ├── security.py           # Security validator
│       ├── performance.py        # Performance validator
│       ├── best_practice.py      # Best practice validator
│       ├── score_engine.py       # Deterministic scoring
│       └── tools.py              # AST, secrets, loop tools
│
├── reforge-ai-review-main/       # New Frontend
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
├── client/                       # Old Frontend (legacy)
├── DOCUMENTATION/                         # Documentation
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

See [Deployment Guide](DOCUMENTATION/DEPLOYMENT.md) for step-by-step instructions.

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](DOCUMENTATION/ARCHITECTURE.md) | System design, data flow, pipeline modes |
| [API Reference](DOCUMENTATION/API_REFERENCE.md) | Complete endpoint documentation |
| [Deployment](DOCUMENTATION/DEPLOYMENT.md) | Render deployment guide |
| [Development](DOCUMENTATION/DEVELOPMENT.md) | Local development setup |
| [Environment](DOCUMENTATION/ENVIRONMENT.md) | Environment variables reference |
| [Security](DOCUMENTATION/SECURITY.md) | Security audit and policy |

---

## Design Principles

1. **Deterministic scoring** — The model generates findings; logic computes scores
2. **Validation before output** — Every AI finding passes through a validator
3. **Graceful degradation** — Agentic → classic → error envelope → mock analysis
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
# ReForge
Test IT-----> https://re-forge.onrender.com/
ReForge is an AI-powered code review platform that analyzes source code using large language models and returns structured feedback on bugs, security vulnerabilities, performance issues, and best practices.

It is built on FastAPI with Groq as the LLM backend, and uses a multi-agent validation pipeline to check every AI-generated finding before it is returned to the client, rather than passing model output through unchecked.

## Overview

Most AI code review tools send a prompt to an LLM and return the response as-is. ReForge treats that response as a draft rather than a final answer. Each finding passes through a validation agent, and the overall quality score is computed deterministically instead of being generated by the model — so identical code produces identical scores.

## Features

- Bug detection: logic errors, runtime issues, exception handling
- Security analysis: hardcoded secrets, injection risks, input validation gaps
- Performance analysis: inefficient algorithms, nested loops, memory usage
- Best practice recommendations: naming, structure, readability
- Deterministic quality scoring, independent of model self-assessment
- AI-generated review summary
- Validation pipeline applied to all findings before response
- FastAPI backend with interactive Swagger documentation
- Deployment configuration for Render

## Architecture

```
Client request
      │
      ▼
FastAPI route
      │
      ▼
Orchestrator
      │
      ▼
Groq (Llama 3.3 70B) generates findings
      │
      ▼
Validation agents review each finding
  ├── Bug validator
  ├── Security validator
  ├── Performance validator
  └── Best practice validator
      │
      ▼
Score engine computes the final score
      │
      ▼
JSON response
```

Each review makes a single call to the LLM. Validation and scoring are handled deterministically downstream, so results do not depend on repeated model calls or self-reported confidence.

## Project structure

```
ReForge/
├── app/
│   ├── agents/
│   │   ├── bug.py
│   │   ├── security.py
│   │   ├── performance.py
│   │   ├── best_practice.py
│   │   ├── orchestrator.py
│   │   └── score_engine.py
│   ├── ai.py
│   ├── routes.py
│   └── main.py
├── .env
├── .gitignore
├── requirements.txt
├── render.yaml
└── README.md
```

## Scoring methodology

Rather than asking the model to assign a score, ReForge deducts points based on the severity of each finding:

| Severity | Deduction |
|----------|-----------|
| Critical | -30       |
| High     | -20       |
| Medium   | -10       |
| Low      | -5        |

This produces consistent, reproducible results across reviews.

## Tech stack

**Backend:** Python, FastAPI, Pydantic, Uvicorn
**AI:** Groq API, Llama 3.3 70B Versatile
**Deployment:** Render

## Getting started

**Clone the repository**

```bash
git clone https://github.com/<your-username>/ReForge.git
cd ReForge
```

**Create a virtual environment**

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux / macOS
python -m venv venv
source venv/bin/activate
```

**Install dependencies**

```bash
pip install -r requirements.txt
```

**Configure environment variables**

Create a `.env` file in the project root:

```
GROQ_API_KEY=your_api_key_here
```

**Run the server**

```bash
uvicorn app.main:app --reload
```

The interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## API reference

| Method | Endpoint    | Description                  |
|--------|-------------|-------------------------------|
| GET    | `/`         | Root / welcome endpoint       |
| GET    | `/health`   | Health check                  |
| GET    | `/test-ai`  | Verifies the Groq connection  |
| POST   | `/review`   | Submits source code for review|

**Example request**

```json
{
  "language": "java",
  "code": "public class Test { ... }"
}
```

**Example response**

```json
{
  "success": true,
  "language": "java",
  "overall_score": 85,
  "summary": "One bug and one security issue found.",
  "reviews": {
    "bug": [],
    "security": [],
    "performance": [],
    "best_practice": []
  }
}
```

## Design principles

- Single responsibility per agent
- Clear separation of concerns
- Deterministic logic wherever feasible; the model generates findings, it does not grade them
- One AI call per review
- All AI responses validated before being returned

## Possible future enhancements

The core platform is complete and functional as described above. Ideas for further extension include a React-based dashboard, GitHub repository review support, and exportable PDF reports.

## Contributing

Issues and pull requests are welcome. To contribute, fork the repository, create a feature branch, and submit a PR describing the change.

## License

Released under the MIT License.

## Author

**Bharathwaj KR**
AI & Full Stack Developer
