# ReForge API Reference

Base URL: `https://reforge-api.onrender.com`

Interactive docs are available at `https://reforge-api.onrender.com/docs` when the deployed backend is running.

---

## Public Endpoints

### `GET /`

Returns a simple service welcome message.

### `GET /health`

Health check used by Render.

**Response:**

```json
{
  "status": "healthy",
  "service": "ReForge API",
  "version": "1.0.0"
}
```

### `GET /test-ai`

Runs a small direct Groq test request.

> This endpoint consumes Groq API credits and is not intended as a production workload endpoint. Consider protecting or removing it before exposing the API publicly at scale.

### `POST /review`

Submit source code for review. Authentication is optional. Anonymous requests are reviewed but are not saved to history; authenticated requests are saved when the review succeeds.

**Request Headers:**

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer <token>` for authenticated requests |

**Request Body:**

```json
{
  "language": "python",
  "code": "def divide(a, b):\n    return a / b"
}
```

**Success response:**

```json
{
  "success": true,
  "language": "python",
  "overall_score": 70,
  "summary": "The code has a potential division by zero issue.",
  "reviews": {
    "bug": [
      {
        "severity": "High",
        "title": "Division by Zero",
        "description": "The function does not handle the case where b is zero.",
        "recommendation": "Validate b before division."
      }
    ],
    "security": [],
    "performance": [],
    "best_practice": []
  }
}
```

**Failure response:**

If the agentic pipeline times out or raises an unexpected exception, the current implementation returns an explicit failure envelope instead of a second review pipeline:

```json
{
  "success": false,
  "language": "python",
  "overall_score": 0,
  "summary": "Review failed. Please try again.",
  "reviews": {
    "bug": [],
    "security": [],
    "performance": [],
    "best_practice": []
  }
}
```

---

## Authentication Endpoints

### `POST /auth/register`

Creates a new user account and returns a JWT access token.

```json
{
  "email": "student@example.com",
  "password": "password123",
  "name": "Student"
}
```

### `POST /auth/login`

Authenticates an existing user and returns a JWT access token.

```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

### `GET /auth/me`

Returns the currently authenticated user. Requires a Bearer token.

---

## Review History Endpoints

### `GET /history`

Returns saved reviews belonging to the authenticated user.

### `GET /history/{review_id}`

Returns the full saved review for the authenticated user.

### `DELETE /history`

Deletes all saved reviews belonging to the authenticated user.

### `DELETE /account`

Deletes the authenticated user's account and saved reviews.

---

## Response Schema

### Review Envelope

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether the review completed successfully |
| `language` | string | Submitted programming language |
| `overall_score` | number | Deterministic score from 0 to 100 |
| `summary` | string | Review summary |
| `reviews` | object | Findings grouped into four categories |
| `review_id` | integer | Present when an authenticated successful review is saved |

### Reviews Object

| Key | Description |
|---|---|
| `bug` | Logic and runtime issues |
| `security` | Security vulnerabilities and credential issues |
| `performance` | Efficiency and performance issues |
| `best_practice` | Maintainability and code-quality issues |

### Finding Object

| Field | Type | Description |
|---|---|---|
| `severity` | string | `Critical`, `High`, `Medium`, or `Low` |
| `title` | string | Short finding title |
| `description` | string | Explanation of the issue |
| `recommendation` | string | Suggested improvement |

---

## Severity and Scoring

| Severity | Score Deduction |
|---|---:|
| Critical | -30 |
| High | -20 |
| Medium | -10 |
| Low | -5 |

The score starts at 100 and is clamped at 0.

---

## Supported Languages

The API accepts a language string and sends it to the LLM pipeline. The frontend currently offers:

- `python`
- `javascript`
- `typescript`
- `java`
- `go`
- `rust`

Deterministic tools have language-specific behavior. See [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Error Handling

| Scenario | Current behavior |
|---|---|
| Missing request fields | FastAPI/Pydantic returns HTTP 422 |
| Invalid credentials | Authentication endpoint returns HTTP 401 |
| Duplicate registration email | Registration returns HTTP 409 |
| Agentic timeout | Review returns a `success: false` failure envelope |
| Unexpected review exception | Review returns a `success: false` failure envelope |
| Invalid LLM JSON | Pipeline safely converts it to an empty/default structure before validation |
| Invalid finding severity | Validator normalizes it to `Low` |

---

## Current Security Limitations

The API currently does not enforce request rate limiting or request body size limits. Anonymous `/review` requests and `/test-ai` can therefore consume Groq API credits. See [SECURITY.md](SECURITY.md) for the current security posture and recommended hardening.
