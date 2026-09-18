# ReForge

ReForge is a code review web application that uses an LLM to review source code for bugs, security issues, performance problems, and general code quality.

The main idea is simple: **let the model find possible problems, but keep important application decisions in normal code.**

## What it does

A review request goes through these steps:

1. A planner looks at the submitted code and chooses the review areas that make sense.
2. The selected specialist prompts review the code.
3. Small deterministic checks run alongside the specialists:
   - Python AST checks for syntax errors, bare `except`, and `eval`/`exec`
   - simple secret-pattern detection
   - a heuristic check for some possible infinite loops
4. A critic combines the specialist findings and removes obvious duplicates or false positives.
5. The application normalizes the findings.
6. The score is calculated in Python from the finding severities. The LLM does not choose the final number.

## Architecture

```text
Browser
   |
   | POST /review
   v
FastAPI
   |
   v
Planner
   |
   +--------+---------+----------------+
   |        |         |                |
   v        v         v                v
  Bugs   Security  Performance   Best Practice
   |        |         |                |
   +--------+---------+----------------+
                    |
                    v
                  Critic
                    |
                    v
                Validation
                    |
                    v
              Score calculation
                    |
                    v
                 JSON result
```

The frontend and backend are separate parts of the project:

| Part | Technology |
|---|---|
| Backend | Python, FastAPI |
| AI | Groq API |
| Database | SQLAlchemy, PostgreSQL in production, SQLite locally |
| Frontend | HTML, CSS, vanilla JavaScript |
| Authentication | JWT + bcrypt |
| Deployment | Render |

## Project structure

```text
Re_Forge/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── routes.py
│   ├── auth.py
│   ├── database.py
│   ├── models.py
│   ├── ai.py
│   └── review_pipeline/
│       ├── pipeline.py
│       ├── prompts.py
│       ├── validators.py
│       ├── score.py
│       └── tools.py
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── docs/
├── .env.example
├── requirements.txt
└── render.yaml
```

## Running locally

### Requirements

- Python 3.10+
- A Groq API key
- PostgreSQL if you want to use the production-style database setup. SQLite is enough for local development.

### Backend

Windows:

```bash
python -m venv venv
.\\venv\\Scripts\\activate
pip install -r requirements.txt
```

Linux/macOS:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-20b
DATABASE_URL=sqlite:///./reforge.db
JWT_SECRET=change-this-for-local-development
```

Start the API:

```bash
uvicorn backend.main:app --reload
```

The API is available at `http://localhost:8000`.

FastAPI's interactive documentation is at `http://localhost:8000/docs`.

### Frontend

From the `frontend` directory:

```bash
python -m http.server 5173
```

Open `http://localhost:5173`.

The frontend API URL is configured in `frontend/js/config.js`.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API welcome response |
| GET | `/health` | Health check |
| GET | `/test-ai` | Test the Groq connection |
| POST | `/review` | Review submitted code |
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Sign in |
| GET | `/auth/me` | Get the current user |
| GET | `/history` | List saved reviews |
| GET | `/history/{review_id}` | Get one saved review |
| DELETE | `/history` | Delete saved reviews |
| DELETE | `/account` | Delete the account and its reviews |

## Scoring

The score starts at 100 and is reduced according to the severity of validated findings:

| Severity | Deduction |
|---|---:|
| Critical | 30 |
| High | 20 |
| Medium | 10 |
| Low | 5 |

The score cannot go below 0.

Keeping this calculation in application code makes the numerical result reproducible even when the LLM is not.

## Deterministic checks

ReForge is not only an LLM wrapper.

The local tools currently provide a few small checks:

- `ast_quick_check()` uses Python's `ast` module when the submitted language is Python.
- `detect_hardcoded_secrets()` looks for common secret-like assignments with regular expressions.
- `detect_infinite_loops()` looks for some `while True` patterns and checks whether an obvious exit appears nearby.

These checks are intentionally small heuristics. They are not a replacement for a real static-analysis engine.

## Limitations

ReForge is a learning project, so the review should not be treated as proof that code is safe or correct.

Some important limitations:

- LLM findings can still be wrong.
- The planner can select the wrong specialists.
- The secret detector uses simple patterns and can miss or falsely flag values.
- Infinite-loop detection is heuristic.
- The system currently reviews the submitted source text rather than building and executing it.
- The final score is deterministic, but the findings and their severities still depend on the model response.

## Why the score is deterministic

I deliberately keep scoring outside the model.

The model is useful at interpreting code and describing possible issues. It is much less useful as the sole authority for a number such as "your code is 73/100."

ReForge therefore uses the model for findings and Python code for the final calculation.

## Documentation

More detailed notes are available in:

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Development](docs/DEVELOPMENT.md)
- [Environment](docs/ENVIRONMENT.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)

## Project status

The project is functional and has been iterated through several rounds of debugging and reliability fixes. The current code favors a small number of understandable components over adding another abstraction just because the framework allows it.

## Author

**Bharathwaj KR**

AI & Full Stack Developer
