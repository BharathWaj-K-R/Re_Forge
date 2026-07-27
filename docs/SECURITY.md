# ReForge Security Policy & Audit

## Security Audit Summary

| Category | Status | Severity |
|---|---|---|
| Authentication | JWT + verified email for saved user flows | MEDIUM |
| Rate Limiting | Not implemented | HIGH |
| CORS | Configured with allow-list | LOW risk |
| Input Validation | Pydantic schema validation | MEDIUM (no size limits) |
| Secrets Management | Env vars, gitignored | LOW risk |
| XSS | Mitigated with explicit HTML escaping in static render helpers | LOW risk |
| CSRF | Not applicable (no cookie auth) | N/A |
| SQL Injection | SQLAlchemy ORM queries | LOW risk |
| Dependency Vulnerabilities | No known CVEs at time of audit | LOW risk |

---

## Current Security Posture

### What's Protected

- **CORS**: Only explicitly allowed origins can access the API
- **Input validation**: Pydantic rejects malformed requests (422)
- **Secrets**: API keys stored in env vars, never committed to git
- **XSS**: Static rendering helpers escape backend-provided finding content before injecting HTML
- **JSON parsing**: LLM output is validated and normalized before use

### What's Not Protected

#### 1. Public Review and Test Endpoints (MEDIUM)

Anonymous users can submit code to `/review`, and `/test-ai` calls the LLM directly. These are useful for demos, but they can consume Groq API credits.

**Recommendation:** Add rate limiting and consider protecting `/test-ai` in production.

#### 2. No Rate Limiting (HIGH)

A single client can send unlimited requests. An attacker could:
- Exhaust Groq API credits
- Cause service degradation for other users

**Recommendation:** Add `slowapi` or a reverse-proxy rate limit.

#### 3. No Input Size Limits (MEDIUM)

The `code` field accepts arbitrarily large strings. A malicious client could:
- Send megabytes of code per request
- Cause memory pressure or Groq timeout

**Recommendation:** Add `max_length` to the Pydantic model:

```python
class ReviewRequest(BaseModel):
    language: str = Field(..., max_length=50)
    code: str = Field(..., max_length=100_000)
```

#### 4. Debug Endpoint in Production (MEDIUM)

`GET /test-ai` calls the LLM directly without authentication. Each call costs Groq API credits.

**Recommendation:** Remove or protect behind auth.

---

## Threat Model

### Attack Vectors

| Attack | Likelihood | Impact | Mitigation |
|---|---|---|---|
| API credit exhaustion | High | High | Add rate limiting |
| Code injection via LLM | Low | Medium | LLM output is validated, not executed |
| CORS bypass | Low | Low | Allow-list is explicit, empty strings filtered |
| Denial of service | Medium | Medium | Add rate limiting + input size limits |
| Secret leakage | Low | High | Env vars only, gitignored |
| Supply chain attack | Low | Medium | Frontend has no runtime npm dependencies |

### What Cannot Happen

- **No file system access** from user input → No path traversal
- **No cookie-based auth** → No CSRF
- **Escaped static rendering** → Reduced stored/reflected XSS risk
- **No user-controlled URLs** → No SSRF

---

## CORS Configuration

The backend CORS middleware allows requests only from:

```python
origins = [
    "http://localhost:5173",              # Local dev
    "http://localhost:3000",              # Legacy dev
    os.getenv("NEW_FRONTEND_URL", ""),    # Configurable deployed frontend
]
```

Empty strings are filtered out (`if o`). This prevents accidental wildcard-like behavior from unset env vars.

---

## Dependency Security

### Backend

All dependencies pinned to specific versions in `requirements.txt`. No unpinned (`>=`) dependencies.

### Frontend

The frontend has no runtime npm dependencies. The optional `npm run build` script only copies static files into `dist/` for Render compatibility.

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please email the maintainer directly rather than opening a public issue.

---

## Security Roadmap

| Priority | Item | Status |
|---|---|---|
| P0 | Add rate limiting | Planned |
| P0 | Add API authentication | Planned |
| P1 | Add input size limits | Planned |
| P1 | Remove /test-ai endpoint | Planned |
| P2 | Add request logging with audit trail | Planned |
| P2 | Add Content-Security-Policy headers | Planned |
| P3 | Add HSTS header | Planned |
