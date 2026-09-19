# ReForge Environment

ReForge keeps runtime configuration small.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| GROQ_API_KEY | For reviews | empty | Groq API credential |
| GROQ_MODEL | No | openai/gpt-oss-20b | Model used by the review pipeline |
| NEW_FRONTEND_URL | Recommended | empty | Allowed frontend origin(s), comma-separated |
| AGENT_TIMEOUT_SECONDS | No | 25 | Review timeout |
| LOG_LEVEL | No | INFO | Application logging level |

No database URL, JWT secret, password-hashing configuration, or account/session configuration is required.

Keep secrets in Render environment variables or a local uncommitted .env file. Never commit provider API keys.
