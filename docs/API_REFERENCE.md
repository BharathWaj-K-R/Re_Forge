# ReForge API reference

The backend exposes a small public JSON API. No endpoint requires an account.

## GET /

Returns a public service welcome response.

## GET /health

Returns the API health status. This endpoint does not call the LLM and does not require external services.

## GET /test-ai

Sends one small request to Groq. This is a development diagnostic and can consume API credits.

## POST /review

Runs an anonymous code review.

Request:

{
  "language": "python",
  "code": "def divide(a, b):\n    return a / b"
}

A normal response contains:

- success
- language
- overall_score
- summary
- reviews

The reviews object contains bug, security, performance, and best_practice arrays.

If the review pipeline fails or times out, its existing failure envelope is returned instead of crashing the API process.

## Finding format

Each finding contains:

{
  "severity": "High",
  "title": "Short title",
  "description": "What is wrong",
  "recommendation": "How to improve it"
}

Severity values are Critical, High, Medium, and Low.

## Scoring

The score starts at 100.

| Severity | Deduction |
|---|---:|
| Critical | 30 |
| High | 20 |
| Medium | 10 |
| Low | 5 |

The score is calculated in Python and cannot go below 0.

## Supported language handling

The frontend provides Python, JavaScript, TypeScript, Java, Go, and Rust.

Deterministic checks only apply where their implementation supports the submitted language.

## Validation and errors

FastAPI validates malformed request bodies and returns HTTP 422.

The pipeline validates model output before findings are used for rendering and scoring. Malformed findings are skipped and unsupported severities are normalized.

The public API does not execute submitted source code.

## Runtime design

ReForge intentionally has no authentication, database, session storage, or review-history endpoints. This keeps the public review path independent of PostgreSQL and other persistence services.
