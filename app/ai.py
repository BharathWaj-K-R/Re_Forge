import json
import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

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


def review_code(language: str, code: str):

    user_prompt = f"""
Programming Language:
{language}

Code:
{code}
"""

    try:

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0,
            response_format={
                "type": "json_object"
            },
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ]
        )

        return json.loads(
            response.choices[0].message.content
        )

    except Exception as e:

        print("Groq Error:", e)

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