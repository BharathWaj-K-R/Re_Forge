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

SYSTEM_PROMPT = """
You are ReForge AI, an expert code review system.

Review the submitted source code.

Return ONLY valid JSON.

Use EXACTLY this schema:

{
  "overall_score": 0,
  "summary": "",
  "reviews": {
    "bug": [],
    "security": [],
    "performance": [],
    "best_practice": []
  }
}

Rules:

- Review Bugs
- Review Security
- Review Performance
- Review Best Practices

Severity values:
Critical
High
Medium
Low

If a category has no issues, return an empty array.
"""


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


def review_code(language: str, code: str):
    """
    Classic single-call review pipeline.

    Returns a dict matching the standard review envelope.
    """

    user_prompt = f"""
Programming Language:
{language}

Code:
{code}
"""

    try:
        content = call_llm(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_format="json_object"
        )
        return json.loads(content)

    except Exception as e:
        logger.error("Groq Error: %s", e)

        return {
            "overall_score": 0,
            "summary": "Unable to review the code at this time.",
            "reviews": {
                "bug": [],
                "security": [],
                "performance": [],
                "best_practice": []
            }
        }
