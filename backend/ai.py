import json
import logging
import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

logger = logging.getLogger(__name__)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def call_llm(
    system_prompt: str,
    user_prompt: str,
    response_format: str | None = "json_object",
    model: str | None = None,
    temperature: float = 0
):
    """
    Generic synchronous LLM call via Groq.

    Returns the raw string content from the model.
    """

    if model is None:
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

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

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content

