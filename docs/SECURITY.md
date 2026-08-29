# ReForge Security Policy & Audit

## Security Audit Summary

| Category | Status | Severity |
|---|---|---|
| Authentication | JWT bearer authentication | MEDIUM |
| Rate Limiting | Not implemented | HIGH |
| CORS | Explicit origin allow-list | LOW risk |
| Input Validation | Pydantic request schema, but no code-size limit | MEDIUM |
| Secrets Management | Environment variables and gitignored `.env` | LOW risk |
| XSS | Backend-provided finding text is escaped before HTML insertion | LOW risk |
| CSRF | Not applicable to bearer-token authentication | N/A |
| SQL Injection | SQLAlchemy ORM queries | LOW risk |

## Current Security Posture

### Protected

- **CORS**: Requests are restricted to configured origins.
- **Input shape validation**: FastAPI/Pydantic validates required request fields.
- **Secrets**: API keys and database credentials are expected through environment variables.
- **XSS**: Frontend rendering escapes backend-provided finding content before inserting HTML.
- **LLM output handling**: Pipeline JSON is parsed and finding fields are normalized before rendering and scoring.
- **Authentication**: Saved review history and account operations require a valid JWT.

### Known Limitations

#### 1. No rate limiting

Anonymous clients can submit unlimited `/review` requests, and `/test-ai` can call Groq directly. This can consume API credits or degrade service availability.

**Recommendation:** Add application or reverse-proxy rate limiting before exposing the service to untrusted high-volume traffic.

#### 2. No request size limit

The `code` field currently has no explicit maximum length. Very large requests may increase memory use, token usage, latency, and Groq cost.

**Recommendation:** Add a reasonable Pydantic `max_length` to the request fields after confirming an appropriate limit for the project.

#### 3. Public `/test-ai` endpoint

`GET /test-ai` makes a direct Groq request without authentication.

**Recommendation:** Remove it from production or protect it before broader public use.

#### 4. Development JWT fallback

The backend contains a development fallback JWT secret in configuration. Production deployments must override `JWT_SECRET` with a strong secret stored in the Render environment.

## CORS Configuration

The backend permits these development origins and the configured deployed frontend origin:

```python
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    *_extra_origins,
]
```

`NEW_FRONTEND_URL` can contain one or more comma-separated origins. Empty values are ignored.

## Dependency Security

Backend dependencies are pinned to specific versions in `requirements.txt`.

The frontend has no runtime npm dependencies. Its optional npm script is only a static-file copy step for compatibility with an existing Render build configuration.

## Security Principles

1. Do not commit `.env` or real API keys.
2. Keep `JWT_SECRET` strong and private in production.
3. Keep the frontend CORS origin restricted to the deployed frontend.
4. Do not execute user-submitted code on the server.
5. Treat LLM findings as untrusted data and validate/escape them before use.
6. Add rate limiting and request-size limits before high-volume public use.
