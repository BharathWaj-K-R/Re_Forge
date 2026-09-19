# ReForge Security Notes

ReForge is intentionally a public, anonymous code-review service.

## Security posture

| Category | Status |
|---|---|
| Authentication | Not used |
| Database | Not used |
| Rate limiting | Not implemented |
| CORS | Explicit origin allow-list |
| Input validation | Pydantic request schema |
| Code execution | Not performed |
| XSS | Finding text is escaped before HTML insertion |
| LLM output validation | Implemented |
| Secrets | Environment variables |

## Public API considerations

The /review endpoint is intentionally anonymous. Because it can invoke the LLM provider, unrestricted public traffic can consume API credits and service resources.

The current application does not implement request rate limiting or a strict code-size limit.

Before high-volume public use, add rate limiting and a request-size policy at the application or reverse-proxy layer.

## /test-ai

The /test-ai endpoint directly calls the LLM provider and is intended as a diagnostic endpoint. It can consume provider credits and should be removed or restricted if the service is exposed to uncontrolled traffic.

## Input and output handling

FastAPI/Pydantic validates the review request shape.

Submitted source code is analyzed as text. ReForge does not build or execute it.

LLM output is parsed and normalized before the frontend receives findings. The frontend escapes backend-provided finding text before inserting it into HTML.

## CORS

The backend permits local development origins and configured deployed frontend origins.

NEW_FRONTEND_URL may contain comma-separated origins. Empty values are ignored.

## Secrets

Never commit .env files or provider API keys.

GROQ_API_KEY belongs in Render environment variables or an uncommitted local .env file.

## De-AI-ification security principle

The runtime intentionally avoids unnecessary authentication and persistence machinery. There are no fake sessions, fake users, fake database fallbacks, or hidden state pretending to provide guarantees that do not exist.

## Remaining hardening work

1. Add rate limiting.
2. Add a maximum code/request size.
3. Consider removing /test-ai from production.
4. Keep dependency versions reviewed and updated.
5. Continue treating LLM findings as untrusted input.
