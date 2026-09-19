# ReForge

ReForge is a public code review web application that uses an LLM to inspect source code for bugs, security issues, performance problems, and general code quality.

The design keeps important decisions in normal code: the model proposes findings, deterministic validation filters them, and Python calculates the final score.

## Public-by-default design

ReForge requires no account and has no database dependency.

Browser -> POST /review -> FastAPI -> review pipeline -> JSON result

The runtime intentionally contains no authentication, JWT, bcrypt, SQLAlchemy, PostgreSQL, or review-history storage. A missing database therefore cannot crash the application.

## Review pipeline

1. Planner selects relevant review areas.
2. Specialist analysis examines the submitted code.
3. Deterministic checks run alongside the specialists.
4. Critic combines findings and removes obvious duplicates or weak findings.
5. Findings are normalized.
6. Python calculates the final score.

The model never chooses the final numerical score.

## Project structure

Re_Forge/
  backend/
    main.py
    config.py
    routes.py
    ai.py
    review_pipeline/
      pipeline.py
      prompts.py
      validators.py
      score.py
      tools.py
  frontend/
    index.html
    css/
    js/
    assets/
  docs/
  .env.example
  requirements.txt
  render.yaml

## Running locally

Requirements:

- Python 3.10+
- Groq API key for live reviews

Install:

Windows:
python -m venv venv
.\\venv\\Scripts\\activate
pip install -r requirements.txt

Linux/macOS:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

Environment:

GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-20b
AGENT_TIMEOUT_SECONDS=25
LOG_LEVEL=INFO

Start the API:

uvicorn backend.main:app --reload

Start the frontend from frontend/:

python -m http.server 5173

## API

GET /          Public API welcome response
GET /health    Health check
GET /test-ai   Test the LLM connection
POST /review   Anonymous code review

No endpoint requires authentication.

## Scoring

Starting score: 100.

Critical: -30
High: -20
Medium: -10
Low: -5

The score has a floor of 0.

## Limitations

ReForge is a learning project. A review is not proof that code is safe or correct.

LLM findings can be wrong, deterministic checks are intentionally small heuristics, and the system reviews submitted source text rather than building and executing it. Reviews are not persisted.

## De-AI-ification

The project favors a small, explainable architecture:

- Plain HTML, CSS, and vanilla JavaScript
- Small FastAPI backend
- No account system
- No persistence layer
- Deterministic scoring
- Deterministic validation around model output
- Explicit failure envelopes
- No fake authentication or fake database state

The goal is software that a human can read, explain, debug, and maintain without an AI-shaped abstraction for every operation.

## Deployment

The backend uses Render's supplied PORT:

uvicorn backend.main:app --host 0.0.0.0 --port $PORT

The frontend is a static site. PostgreSQL is not required.

## Documentation

- docs/ARCHITECTURE.md
- docs/API_REFERENCE.md
- docs/DEVELOPMENT.md
- docs/ENVIRONMENT.md
- docs/SECURITY.md
- docs/DEPLOYMENT.md

## Author

Bharathwaj KR

AI & Full Stack Developer
