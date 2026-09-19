import logging
import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

logger = logging.getLogger(__name__)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

DEFAULT_MODEL = "openai/gpt-oss-20b"
FALLBACK_MODELS = (
    "openai/gpt-oss-120b",
    "llama-3.1-8b-instant",
)


def _is_model_not_found(error):
    status = getattr(error, "status_code", None)
    message = str(error).lower()
    return (
        status == 404
        and "model" in message
        and ("not found" in message or "does not exist" in message)
    ) or "model_not_found" in message


def _complete(model, system_prompt, user_prompt, response_format, temperature):
    request = {
        "model": model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    if response_format:
        request["response_format"] = {"type": response_format}

    response = client.chat.completions.create(**request)
    return response.choices[0].message.content


def call_llm(
    system_prompt,
    user_prompt,
    response_format="json_object",
    model=None,
    temperature=0,
):
    """Send one chat request to Groq, with a small model fallback list."""
    configured = model or os.getenv("GROQ_MODEL", DEFAULT_MODEL)
    models = [configured] + [m for m in FALLBACK_MODELS if m != configured]

    for candidate in models:
        try:
            return _complete(
                candidate,
                system_prompt,
                user_prompt,
                response_format,
                temperature,
            )
        except Exception as error:
            if not _is_model_not_found(error):
                raise
            logger.warning("Groq model %s is unavailable", candidate)

    raise RuntimeError(
        "No configured Groq model is available. Check GROQ_MODEL and the "
        "models enabled for the API key."
    )
