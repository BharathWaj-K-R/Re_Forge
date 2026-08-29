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

# Current Groq text models known to support the JSON-object mode used by
# ReForge. The Models API is still consulted at runtime so the app can adapt to
# project-level model permissions and future model changes.
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
    """Build a safe ordered list of ReForge-compatible text models."""
    discovered = _discover_models()
    discovered_set = set(discovered)
    candidates: list[str] = []

    def add(model: str | None):
        if model and model not in candidates:
            candidates.append(model)

    # Respect an explicitly configured model when the account can see it.
    if configured_model in discovered_set:
        add(configured_model)

    # Only select models that are known to be suitable for ReForge's text + JSON
    # chat workload. Never blindly select arbitrary catalog entries such as
    # audio or guard models.
    for model in PREFERRED_MODELS:
        if model in discovered_set:
            add(model)

    # If the model listing is unavailable, retain the current configured model
    # and documented production candidates as a last resort. The review
    # pipeline has its deterministic local fallback for complete AI failure.
    if not candidates:
        add(configured_model)
        for model in PREFERRED_MODELS:
            add(model)

    logger.info("Groq model candidates: %s", candidates)
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

    The configured model is used when it is actually exposed by the current
    Groq key. Otherwise ReForge discovers the accessible catalog and tries the
    current compatible production models. Model-not-found errors are retried;
    unrelated API errors are propagated so they can be handled by the review
    pipeline's existing fallback path.
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
            logger.warning(
                "Groq model '%s' unavailable; trying next compatible candidate.",
                candidate,
            )
            _discover_models(force_refresh=True)

    if last_model_error is not None:
        raise RuntimeError(
            "No accessible Groq text model is available for this API key/project. "
            "Check the Groq project's model permissions or GROQ_MODEL setting."
        ) from last_model_error

    raise RuntimeError("No Groq model candidate is available")
