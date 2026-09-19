# ReForge Architecture

## System Overview

ReForge is a two-service public web application:

- Backend: FastAPI Web Service hosting the review pipeline
- Frontend: Static Site serving plain HTML, CSS, and vanilla JavaScript

There is no authentication or persistence layer in the runtime.

## Request Pipeline

Client
  -> POST /review
  -> FastAPI
  -> Planner
  -> Specialist analysis
  -> Deterministic checks
  -> Critic
  -> Validation
  -> Deterministic score
  -> JSON response

The planner may skip specialists when appropriate. The pipeline still returns a stable set of response categories for the frontend.

## Runtime boundaries

The application has two meaningful runtime dependencies:

1. The FastAPI process must start and accept HTTP requests.
2. A review requires the configured LLM provider.

PostgreSQL, SQLAlchemy, JWT, bcrypt, and user-session storage are intentionally removed from the runtime.

A missing database therefore cannot crash startup because the application does not attempt a database connection.

## Failure behavior

- GET /health does not require the LLM provider.
- GET / does not require the LLM provider.
- POST /review uses the pipeline's existing failure envelope when review processing fails.
- The frontend displays review failures instead of treating them as successful results.

## Frontend

The frontend uses HTML, CSS, and vanilla JavaScript.

There is no authentication state, account UI, session storage, or history UI. Every visitor can use the review bench anonymously.

## Scoring

The score is calculated from validated findings:

| Severity | Deduction |
|---|---:|
| Critical | -30 |
| High | -20 |
| Medium | -10 |
| Low | -5 |

Starting score: 100. Floor: 0.

The model proposes findings; application code calculates the score.

## Design principles

1. Small surface area
2. Deterministic scoring
3. Validation before output
4. Failure-safe review responses
5. Public by default
6. Human-readable code
