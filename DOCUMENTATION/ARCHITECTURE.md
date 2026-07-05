# ReForge Architecture

## System Overview

ReForge is a two-service platform deployed on Render:

- **Backend** — FastAPI Web Service hosting the AI review pipeline
- **Frontend** — Static Site (Vite + React) serving the web UI

Both services are independent and can be deployed, scaled, and updated separately.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Render Cloud                              │
│                                                                  │
│  ┌────────────────────────┐       ┌───────────────────────────┐ │
│  │  Backend Web Service    │       │  Frontend Static Site      │ │
│  │                        │       │                           │ │
│  │  FastAPI + Uvicorn      │  HTTPS│  Vite 8 + React 19       │ │
│  │  Groq Llama 3.3 70B    │◄─────│  Tailwind CSS v4          │ │
│  │                        │       │  Three.js + shadcn/ui     │ │
│  │  /review  /health  /   │       │  VITE_API_URL (build)     │ │
│  └────────────────────────┘       └───────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────┐                                      │
│  │  Old Frontend (legacy) │  Untouched, still deployable        │
│  │  client/               │                                      │
│  └────────────────────────┘                                      │
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
│  Orchestrator    │  Checks AGENT_MODE env var
│  orchestrator.py │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
 Classic    Agentic
 (default)  (optional)
```

### Classic Pipeline (Default)

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
│  bug.py / security.py /          │  fixes invalid severities,
│  performance.py / best_practice.py│  ensures all fields present
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Score Engine     │  100 - sum(severity deductions)
│  score_engine.py  │  Floor at 0
└────────┬──────────┘
         │
         ▼
Response Envelope
{ success, language, overall_score, summary, reviews }
```

**LLM calls:** 1  
**Latency:** ~1-3 seconds  
**Reproducibility:** Same code + same findings = same score every time

### Agentic Pipeline (Optional)

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
**Timeout:** Configurable (default 25s), falls back to classic on timeout  
**Deterministic tools:** AST check, secret detection, infinite loop detection

### Mode Switching

Controlled by the `AGENT_MODE` environment variable:

| Value | Behavior |
|---|---|
| `classic` (default) | Single LLM call pipeline |
| `agentic` | Multi-agent pipeline with timeout fallback |

If agentic mode fails or times out, the system automatically falls back to classic mode for that request.

## Frontend Architecture

### Technology

- **Vite 8** — Build tool and dev server
- **React 19** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS v4** — Styling with custom design tokens
- **Three.js** — 3D hero orb and floating cards animations
- **shadcn/ui** — Radix-based component primitives

### Component Structure

```
main.tsx
  └── Landing.tsx (main page component)
        ├── HeroOrb.tsx (Three.js 3D sphere)
        ├── MiniCards.tsx (Three.js floating cards)
        └── UI Sections:
            ├── Nav (fixed glass-morphism navbar)
            ├── Hero (branding + 3D orb)
            ├── Demo (code editor + review results)
            ├── Features (4 category descriptions)
            ├── How It Works (3-step explainer)
            └── Footer (links)
```

### API Integration

The frontend reads `VITE_API_URL` at build time:

- If set → sends `POST /review` to the backend
- If not set → runs in offline demo mode with heuristic analysis
- On API failure → shows error message + falls back to local analysis

### Response Transformation

The backend returns findings as arrays. The frontend transforms these into per-category scores for display:

```
Backend: { reviews: { bug: [{severity: "High", ...}] } }
                │
                ▼
Frontend: { bugs: { score: 80, issues: ["..."] } }
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
Review pipeline runs (classic or agentic)
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
3. **Graceful degradation** — Agentic falls back to classic; frontend falls back to mock
4. **Separation of concerns** — Each module has one responsibility
5. **Reproducibility** — Same input → same output, every time
6. **Two-service architecture** — Frontend and backend deploy independently
