# ReForge API Reference

Base URL: `https://reforge-api.onrender.com`

Interactive docs available at: `https://reforge-api.onrender.com/docs` (Swagger UI)

---

## Endpoints

### `GET /`

Welcome message.

**Response:**

```json
{
  "success": true,
  "message": "Welcome to ReForge API"
}
```

---

### `GET /health`

Health check for monitoring and load balancers.

**Response:**

```json
{
  "status": "healthy",
  "service": "ReForge API",
  "version": "1.0.0"
}
```

**Used by:** Render health check (configured in `render.yaml`)

---

### `GET /test-ai`

Verifies the Groq API connection by running a test review.

**Response:**

```json
{
  "success": true,
  "result": { ... }
}
```

> **Note:** This endpoint consumes Groq API credits. Consider removing or protecting it in production.

---

### `POST /review`

Submit source code for AI-powered review.

**Request Headers:**

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |

**Request Body:**

```json
{
  "language": "string (required)",
  "code": "string (required)"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `language` | string | Yes | Programming language (e.g., `python`, `javascript`, `go`) |
| `code` | string | Yes | Source code to review |

**Example Request:**

```bash
curl -X POST https://reforge-api.onrender.com/review \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "def divide(a, b):\n    return a / b"
  }'
```

**Success Response (200):**

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
        "description": "The function does not handle the case where b is zero, which will raise a ZeroDivisionError.",
        "recommendation": "Add a check for b == 0 before performing the division."
      }
    ],
    "security": [],
    "performance": [],
    "best_practice": [
      {
        "severity": "Low",
        "title": "Missing Docstring",
        "description": "The function lacks a docstring explaining its purpose and parameters.",
        "recommendation": "Add a docstring following PEP 257 conventions."
      }
    ]
  }
}
```

**Error Response (Groq failure):**

```json
{
  "success": true,
  "language": "python",
  "overall_score": 0,
  "summary": "Unable to review the code at this time.",
  "reviews": {
    "bug": [],
    "security": [],
    "performance": [],
    "best_practice": []
  }
}
```

> Note: The API returns `success: true` even on Groq failure, with a zero score and error summary. This is by design — the endpoint itself succeeded; the AI review was unavailable.

**Validation Error (422):**

```json
{
  "detail": [
    {
      "loc": ["body", "code"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Response Schema

### Review Envelope

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether the review completed |
| `language` | string | Echo of the submitted language |
| `overall_score` | integer | 0-100 quality score |
| `summary` | string | AI-generated review summary |
| `reviews` | object | Categorized findings |

### Reviews Object

| Key | Type | Description |
|---|---|---|
| `bug` | Finding[] | Logic errors, runtime issues |
| `security` | Finding[] | Vulnerabilities, secrets |
| `performance` | Finding[] | Efficiency issues |
| `best_practice` | Finding[] | Code quality issues |

### Finding Object

| Field | Type | Description |
|---|---|---|
| `severity` | string | `Critical`, `High`, `Medium`, or `Low` |
| `title` | string | Short finding title |
| `description` | string | Detailed explanation |
| `recommendation` | string | How to fix or improve |

### Severity Levels

| Severity | Score Deduction | Examples |
|---|---|---|
| Critical | -30 | Remote code execution, SQL injection |
| High | -20 | Hardcoded secrets, division by zero, infinite loops |
| Medium | -10 | Bare except clauses, missing input validation |
| Low | -5 | Missing docstrings, naming conventions |

---

## Supported Languages

The API accepts any language string. The AI adapts its analysis to the specified language. Commonly tested:

- `python`
- `javascript`
- `typescript`
- `go`
- `rust`
- `java`
- `cpp`

Deterministic tools (AST check, secret detection, loop analysis) have language-specific behavior — see [ARCHITECTURE.md](ARCHITECTURE.md) for details.

---

## Rate Limiting

Currently **no rate limiting** is enforced. This is a known limitation for production deployment.

---

## CORS

The API supports Cross-Origin Resource Sharing for the following origins:

- `http://localhost:5173` (local dev)
- `http://localhost:3000` (legacy dev)
- `https://reforge-client.onrender.com` (old frontend)
- Value of `FRONTEND_URL` env var
- Value of `NEW_FRONTEND_URL` env var

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Missing fields in request | 422 Validation Error |
| Groq API unavailable | Returns zero-score envelope with error summary |
| Invalid JSON from LLM | Classic: caught and returned as error. Agentic: fallback to classic |
| Agentic timeout | Falls back to classic pipeline |
| Invalid severity from LLM | Downgraded to "Low" by validator |
