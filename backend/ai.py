import logging
import os
import threading

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

logger = logging.getLogger(__name__)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

# Prefer current production models that support the structured JSON output used
# by ReForge. The runtime Models API decides which of these are actually
# available to the current API key/project.
PREFERRED_MODELS = (
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "llama-3.1-8b-instant",
)

_model_cache: list[str] | None = None
_model_cache_lock = threading.Lock()


def _model_name(item) -> str | None:
    model_id = getattr(item, "id", None)
    active = getattr(item, "active", True)
    if not model_id or active is False:
        return None
    return str(model_id)


def _discover_models(force_refresh: bool = False) -> list[str]:
    """Discover active models exposed by the current Groq API key."""
    global _model_cache

    with _model_cache_lock:
        if _model_cache is not None and not force_refresh:
            return list(_model_cache)

        try:
            response = client.models.list()
            discovered = []
            for item in getattr(response, "data", []) or []:
                model_id = _model_name(item)
                if model_id:
                    discovered.append(model_id)
            _model_cache = discovered
            logger.info("Groq model discovery found %d active models", len(discovered))
            return list(discovered)
        except Exception as exc:
            logger.warning("Groq model discovery failed: %s", exc)
            _model_cache = []
            return []


def _candidate_models(configured_model: str) -> list[str]:
    """Build a safe ordered list of models to try."""
    discovered = _discover_models()
    discovered_set = set(discovered)
    candidates: list[str] = []

    def add(model: str | None):
        if model and model not in candidates:
            candidates.append(model)

    # Respect an explicitly configured model if the account can see it.
    if configured_model in discovered_set:
        add(configured_model)

    # Current, production-oriented models first.
    for model in PREFERRED_MODELS:
        if model in discovered_set:
            add(model)

    # Give any other discovered model a chance instead of hard-coding a model
    # that may disappear in the future.
    for model in discovered:
        add(model)

    # When the Models API cannot be queried, retain sensible documented names
    # as a last resort. The pipeline's local fallback still protects /review.
    if not candidates:
        add(configured_model)
        for model in PREFERRED_MODELS:
            add(model)

    return candidates


def _request_completion(
    model: str,
    system_prompt: str,
    user_prompt: str,
    response_format: str | None,
    temperature: float,
):
    kwargs = {
        "model": model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    if response_format:
        kwargs["response_format"] = {"type": response_format}

    return client.chat.completions.create(**kwargs)


def _is_model_not_found(exc: Exception) -> bool:
    status_code = getattr(exc, "status_code", None)
    text = str(exc).lower()
    return (
        status_code == 404
        and "model" in text
        and ("not found" in text or "does not exist" in text)
    ) or "model_not_found" in text


def call_llm(
    system_prompt: str,
    user_prompt: str,
    response_format: str | None = "json_object",
    model: str | None = None,
    temperature: float = 0
):
    """
    Generic synchronous LLM call via Groq.

    ReForge first tries the configured model when it is visible to the current
    API key. If that model is unavailable, it discovers accessible models and
    retries with a supported production model. Non-model errors are propagated
    normally so rate limits, authentication errors, and malformed requests are
    not hidden.
    """

    configured_model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    candidates = _candidate_models(configured_model)
    last_model_error: Exception | None = None

    for candidate in candidates:
        try:
            response = _request_completion(
                candidate,
                system_prompt,
                user_prompt,
                response_format,
                temperature,
            )
            if candidate != configured_model:
                logger.warning(
                    "Groq model '%s' unavailable; using accessible model '%s'.",
                    configured_model,
                    candidate,
                )
            return response.choices[0].message.content
        except Exception as exc:
            if not _is_model_not_found(exc):
                raise

            last_model_error = exc
            logger.warning("Groq model '%s' unavailable; trying next candidate.", candidate)
            # Refresh after a model-not-found response in case the model list
            # changed or the project permissions were updated.
            _discover_models(force_refresh=True)

    if last_model_error is not None:
        raise RuntimeError(
            "No accessible Groq chat model is available for this API key/project. "
            "Check Groq model permissions or configure GROQ_MODEL to an accessible model."
        ) from last_model_error

    raise RuntimeError("No Groq model candidate is available")
