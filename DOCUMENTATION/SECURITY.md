# ReForge Security Policy & Audit

## Security Audit Summary

| Category | Status | Severity |
|---|---|---|
| Authentication | Not implemented | HIGH |
| Rate Limiting | Not implemented | HIGH |
| CORS | Configured with allow-list | LOW risk |
| Input Validation | Pydantic schema validation | MEDIUM (no size limits) |
| Secrets Management | Env vars, gitignored | LOW risk |
| XSS | Mitigated (React auto-escaping) | LOW risk |
| CSRF | Not applicable (no cookie auth) | N/A |
| SQL Injection | Not applicable (no database) | N/A |
| Dependency Vulnerabilities | No known CVEs at time of audit | LOW risk |

---

## Current Security Posture

### What's Protected

- **CORS**: Only explicitly allowed origins can access the API
- **Input validation**: Pydantic rejects malformed requests (422)
- **Secrets**: API keys stored in env vars, never committed to git
- **XSS**: React's JSX auto-escapes all rendered content
- **JSON parsing**: LLM output is validated and normalized before use

### What's Not Protected

#### 1. No Authentication (HIGH)

All endpoints are publicly accessible. Anyone with the API URL can:
- Submit code for review (consuming Groq API credits)
- Access the `/test-ai` debug endpoint

**Recommendation:** Add API key authentication or use Render's built-in auth.

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
| Supply chain attack | Low | High | Bun 24h supply-chain guard enabled |

### What Cannot Happen

- **No database** → No SQL injection, no data breach
- **No file system access** from user input → No path traversal
- **No user accounts** → No broken auth, no privilege escalation
- **No cookie-based auth** → No CSRF
- **React JSX** → No stored/reflected XSS
- **No user-controlled URLs** → No SSRF

---

## CORS Configuration

The backend CORS middleware allows requests only from:

```python
origins = [
    "http://localhost:5173",              # Local dev
    "http://localhost:3000",              # Legacy dev
    "https://reforge-client.onrender.com", # Old frontend
    os.getenv("FRONTEND_URL", ""),        # Configurable old
    os.getenv("NEW_FRONTEND_URL", ""),    # Configurable new
]
```

Empty strings are filtered out (`if o`). This prevents accidental wildcard-like behavior from unset env vars.

---

## Dependency Security

### Backend

All dependencies pinned to specific versions in `requirements.txt`. No unpinned (`>=`) dependencies.

### Frontend

`bunfig.toml` enforces a 24-hour supply-chain guard:

```toml
[install]
minimumReleaseAge = 86400
```

New package versions must be at least 24 hours old before Bun will install them. This mitigates typosquatting and newly-published malicious packages.

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
