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
│   FastAPI Route  │  Pydantic validates request body
│   routes.py     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Pipeline        │  Unified agentic pipeline
│  pipeline.py     │  with timeout guard
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
 Agentic    Classic
 (default)  (fallback)
```

### Classic Pipeline (Fallback)

The classic pipeline makes a single LLM call, then validates and scores deterministically.

```
Code + Language
      │
      ▼
┌──────────────────┐
│  Single LLM Call  │  Groq Llama 3.3 70B
│  ai.py            │  Returns JSON with findings
└────────┬──────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Validation Layer                 │  Normalizes schema,
│  validators.py                    │  fixes invalid severities,
│                                    │  ensures all fields present
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Score Engine     │  100 - sum(severity deductions)
│  score.py         │  Floor at 0
└────────┬──────────┘
         │
         ▼
Response Envelope
{ success, language, overall_score, summary, reviews }
```

**LLM calls:** 1  
**Latency:** ~1-3 seconds  
**Reproducibility:** Same code + same findings = same score every time

### Agentic Pipeline (Default)

The agentic pipeline uses multiple specialized LLM calls with deterministic tools for deeper analysis.

```
Code + Language
      │
      ▼
┌──────────────────┐
│  Planner Agent    │  LLM Call #1
│  Decides which    │  Selects relevant specialists
│  agents to run    │  Provides focus notes
└────────┬──────────┘
         │
    ┌────┴────────────────────────────┐
    │         │         │             │
    ▼         ▼         ▼             ▼
┌────────┐┌────────┐┌──────────┐┌──────────────┐
│  Bug   ││Security││Perform.  ││Best Practice │
│+ AST   ││+ Secret││+ Loop    ││              │
│  tool  ││  tool  ││  tool    ││              │
│LLM #2  ││LLM #3  ││LLM #4    ││LLM #5 (opt)  │
└────┬───┘└───┬────┘└────┬─────┘└──────┬───────┘
     │        │          │              │
     └────────┴──────────┴──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │  Critic Agent │  LLM Call #6
              │  Deduplicates │  Removes false positives
              │  and filters  │  Produces summary
              └──────┬───────┘
                     │
                     ▼
              Validation Layer (same as classic)
                     │
                     ▼
              Score Engine (same as classic)
```

**LLM calls:** 3-6  
**Latency:** ~5-15 seconds  
**Timeout:** Configurable (default 25s), returns honest failure on timeout  
**Deterministic tools:** AST check, secret detection, infinite loop detection

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
  assets/reforgelogo.png  # Logo asset
```

### API Integration

The frontend reads the backend API URL at runtime from `frontend/js/config.js`:

```js
window.REFORGE_CONFIG = {
  API_URL: "https://reforge-api.onrender.com",
};
```

All API calls use the existing backend routes. Authenticated calls include `Authorization: Bearer <token>` from the `reforge_session` localStorage entry.

### Response Rendering

The backend returns findings as arrays grouped by category. The static frontend renders the overall score, summary, and four finding categories directly from that response:

```text
Backend: { reviews: { bug: [{ severity: "High", ... }] } }
                │
                ▼
Frontend: score panel + bug/security/performance/best-practice cards
```

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
Review pipeline runs (agentic only)
        │
        ▼
Backend returns structured response
{ success, language, overall_score, summary, reviews }
        │
        ▼
Frontend transforms response
        │
        ▼
UI renders:
  - ScoreRing (overall score with animated SVG)
  - CategoryCards (4 cards: bugs, security, performance, best practices)
  - Summary text
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

This ensures identical findings always produce identical scores, regardless of model version or temperature.

## Design Principles

1. **Deterministic scoring** — The model generates findings; logic computes scores
2. **Validation before output** — Every AI finding passes through a validator
3. **Graceful degradation** — Agentic → error envelope → mock analysis
4. **Separation of concerns** — Each module has one responsibility
5. **Reproducibility** — Same input → same output, every time
6. **Two-service architecture** — Frontend and backend deploy independently
