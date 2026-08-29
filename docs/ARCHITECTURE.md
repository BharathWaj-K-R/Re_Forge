# ReForge Architecture

## System Overview

ReForge is a two-service platform deployed on Render:

- **Backend** — FastAPI Web Service hosting the AI review pipeline
- **Frontend** — Static Site serving plain HTML, CSS, and vanilla JavaScript

Both services are independent and can be deployed, scaled, and updated separately.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Render Cloud                              │
│                                                                  │
│  ┌────────────────────────┐       ┌───────────────────────────┐ │
│  │  Backend Web Service    │       │  Frontend Static Site      │ │
│  │                        │       │                           │ │
│  │  FastAPI + Uvicorn      │  HTTPS│  HTML + CSS + JS         │ │
│  │  Groq Llama 3.3 70B    │◄─────│  No framework build       │ │
│  │                        │       │  Runtime API config       │ │
│  │  /review  /health  /   │       │  js/config.js             │ │
│  └────────────────────────┘       └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Architecture

### Request Pipeline

```
Client (Browser)
      │
      │  POST /review { code, language }
      ▼
┌─────────────────┐
│   FastAPI Route │  Pydantic validates request body
│   routes.py     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Review Pipeline │  Agentic pipeline with timeout guard
│  pipeline.py     │
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│ Planner Agent    │  Selects relevant specialist agents
└────────┬─────────┘
         │
    ┌────┴──────────────┬──────────────┐
    ▼                   ▼              ▼
 Bug + AST        Security + Secret   Performance + Loop
    │                   │              │
    └───────────────────┴──────────────┘
                        │
                        ▼
                 Best Practice
                        │
                        ▼
                  Critic Agent
                        │
                        ▼
                 Validation Layer
                        │
                        ▼
                  Score Engine
                        │
                        ▼
                    Response
```

The planner may skip specialists when appropriate. The pipeline still returns all four response categories so the frontend has a stable response shape. The current implementation does not execute a separate classic pipeline fallback.

### Agentic Pipeline

The agentic pipeline uses a planner, up to four specialist agents, deterministic tools, a critic, validators, and the deterministic score engine.

```
Code + Language
      │
      ▼
┌──────────────────┐
│  Planner Agent    │  LLM Call #1
│  Decides which    │  Selects relevant specialists
│  agents to run    │  Provides focus notes
└────────┬─────────┘
         │
    ┌────┴────────────────────────────┐
    │         │         │             │
    ▼         ▼         ▼             ▼
┌────────┐┌────────┐┌──────────┐┌──────────────┐
│  Bug   ││Security││Perform.  ││Best Practice │
│+ AST   ││+ Secret││+ Loop    ││              │
│  tool  ││  tool  ││  tool    ││              │
│LLM     ││LLM     ││LLM       ││LLM           │
└────┬───┘└────┬───┘└────┬─────┘└──────┬───────┘
     │         │          │              │
     └─────────┴──────────┴──────────────┘
                       │
                       ▼
               ┌──────────────┐
               │ Critic Agent │
               │ Deduplicates │
               │ and filters  │
               └──────┬───────┘
                      │
                      ▼
               Validation Layer
                      │
                      ▼
                Score Engine
```

**LLM calls:** 3-6 depending on planner selection  
**Timeout:** Configurable with `AGENT_TIMEOUT_SECONDS` (default 25 seconds)  
**Deterministic tools:** AST check, secret detection, infinite-loop heuristic

On timeout or an unexpected pipeline exception, the current implementation returns a failure envelope instead of raising the error through the API request. The frontend displays that result as a failed review. This is a failure-safe response path, not a second review pipeline.

## Frontend Architecture

### Technology

- **HTML** — Static document structure and app sections
- **CSS** — Plain responsive styling and design tokens
- **Vanilla JavaScript** — API calls, auth state, hash navigation, and rendering
- **Optional npm script** — Copy-only build script for Render compatibility; no React/Vite compilation

### File Structure

```text
frontend/
  index.html              # Static app shell
  css/styles.css          # Plain CSS UI
  js/config.js            # Backend API URL
  js/api.js               # Fetch wrapper and auth headers
  js/auth.js              # Auth/session helpers
  js/review.js            # Review submission and result rendering
  js/history.js           # History/account API helpers
  js/app.js               # Event wiring and hash navigation
  js/gauge.js             # Score gauge rendering
  assets/reforgelogo.png  # Logo asset
```

### API Integration

The frontend reads the backend API URL from `frontend/js/config.js`:

```js
window.REFORGE_CONFIG = {
  API_URL: "https://reforge-api.onrender.com",
};
```

All API calls use the backend routes. Authenticated calls include `Authorization: Bearer <token>` from the `reforge_session` localStorage entry.

## Data Flow

```
User pastes code in browser
        │
        ▼
Frontend sends POST /review
{ code: string, language: string }
        │
        ▼
Backend validates request (Pydantic)
        │
        ▼
Planner selects relevant specialist agents
        │
        ▼
Specialists + deterministic tools run
        │
        ▼
Critic deduplicates and filters findings
        │
        ▼
Validators normalize the findings
        │
        ▼
Score engine calculates deterministic score
        │
        ▼
Backend returns structured response
        │
        ▼
Frontend renders score, summary, and categories
```

## Scoring Methodology

The score is computed deterministically from findings — the LLM never assigns scores.

| Severity | Deduction |
|---|---|
| Critical | -30 |
| High | -20 |
| Medium | -10 |
| Low | -5 |

Starting score: **100**  
Floor: **0** (never negative)

## Database Architecture

The backend uses SQLAlchemy models for users and saved reviews. Production can use PostgreSQL through `DATABASE_URL`; local development falls back to SQLite when that variable is absent.

The application creates missing tables at startup and also checks for missing columns in existing mapped tables. The database module is therefore part of the runtime startup path and must be preserved.

## Authentication Flow

```
Frontend
   │
   ├── POST /auth/register
   │          └── Create User + JWT
   │
   └── POST /auth/login
              └── Validate Password + JWT

JWT stored in browser localStorage
             │
             ▼
Authenticated API request
Authorization: Bearer <token>
```

## Design Principles

1. **Deterministic scoring** — The model generates findings; code computes scores
2. **Validation before output** — AI findings pass through a validator before display
3. **Failure-safe runtime** — Timeout/failure returns an explicit failure envelope
4. **Separation of concerns** — Each module has one clear responsibility
5. **Two-service architecture** — Frontend and backend deploy independently
