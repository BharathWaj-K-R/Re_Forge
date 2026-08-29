import logging
import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

logger = logging.getLogger(__name__)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

# Stable fallback model that supports the JSON object mode used by ReForge.
DEFAULT_MODEL = "llama-3.1-8b-instant"
MODEL_FALLBACKS = (DEFAULT_MODEL,)


def _is_model_not_found_error(exc: Exception) -> bool:
    """Return True only for Groq model-unavailable errors."""
    return (
        getattr(exc, "code", None) == "model_not_found"
        or "model_not_found" in str(exc)
        or "does not exist or you do not have access to it" in str(exc)
    )


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


def call_llm(
    system_prompt: str,
    user_prompt: str,
    response_format: str | None = "json_object",
    model: str | None = None,
    temperature: float = 0
):
    """
    Generic synchronous LLM call via Groq.

    The configured model is attempted first. If Groq reports that model as
    unavailable to the current API key/project, ReForge retries once with the
    stable fallback model instead of failing the entire review pipeline.
    """

    configured_model = model or os.getenv("GROQ_MODEL", DEFAULT_MODEL)

    try:
        response = _request_completion(
            configured_model,
            system_prompt,
            user_prompt,
            response_format,
            temperature,
        )
        return response.choices[0].message.content

    except Exception as exc:
        if configured_model not in MODEL_FALLBACKS and _is_model_not_found_error(exc):
            fallback_model = DEFAULT_MODEL
            logger.warning(
                "Groq model '%s' unavailable; retrying with fallback model '%s'.",
                configured_model,
                fallback_model,
            )
            response = _request_completion(
                fallback_model,
                system_prompt,
                user_prompt,
                response_format,
                temperature,
            )
            return response.choices[0].message.content

        raise
