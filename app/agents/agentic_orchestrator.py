"""
Agentic review pipeline for ReForge.

Flow:
  1. Planner decides which specialist agents are relevant.
  2. Each specialist runs its own LLM call plus one deterministic tool.
  3. Critic deduplicates and filters all findings.
  4. Existing validators normalize output.
  5. Deterministic score engine calculates the final score.
"""

import json
import logging

from app.ai import call_llm
from app.agents.best_practice import validate_best_practice_review
from app.agents.bug import validate_bug_review
from app.agents.performance import validate_performance_review
from app.agents.prompts import (
    BEST_PRACTICE_AGENT_PROMPT,
    BUG_AGENT_PROMPT,
    CRITIC_PROMPT,
    PERFORMANCE_AGENT_PROMPT,
    PLANNER_PROMPT,
    SECURITY_AGENT_PROMPT,
)
from app.agents.score_engine import calculate_score
from app.agents.security import validate_security_review
from app.agents.tools import (
    ast_quick_check,
    detect_hardcoded_secrets,
    detect_infinite_loops,
)

logger = logging.getLogger(__name__)

AGENT_PROMPTS = {
    "bug": BUG_AGENT_PROMPT,
    "security": SECURITY_AGENT_PROMPT,
    "performance": PERFORMANCE_AGENT_PROMPT,
    "best_practice": BEST_PRACTICE_AGENT_PROMPT,
}


def _safe_json_loads(text: str, default=None):
    if default is None:
        default = {}
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse LLM JSON: %s", e)
        return default


def _build_code_prompt(language: str, code: str, extra: str = "") -> str:
    prompt = f"""Programming Language: {language}

Code:
{code}
"""
    if extra:
        prompt += f"\nAdditional Context:\n{extra}\n"
    return prompt


def _run_planner(code: str, language: str) -> tuple[list[str], str]:
    user_prompt = _build_code_prompt(language, code)
    content = call_llm(
        system_prompt=PLANNER_PROMPT,
        user_prompt=user_prompt,
        response_format="json_object"
    )
    data = _safe_json_loads(content, {})

    allowed = {"bug", "security", "performance", "best_practice"}
    relevant = [
        agent for agent in data.get("relevant_agents", [])
        if agent in allowed
    ]

    if not relevant:
        relevant = list(allowed)

    focus_notes = data.get("focus_notes", "")
    skip_reasons = data.get("skip_reasons", {})

    logger.info(
        "Planner selected agents: %s; skipped: %s",
        relevant,
        skip_reasons
    )

    return relevant, focus_notes


def _run_tool_for_agent(agent: str, code: str, language: str) -> list[dict]:
    if agent == "bug":
        return ast_quick_check(code, language)
    if agent == "security":
        return detect_hardcoded_secrets(code)
    if agent == "performance":
        return detect_infinite_loops(code, language)
    return []


def _run_specialist(
    agent: str,
    code: str,
    language: str,
    focus_notes: str
) -> list[dict]:
    tool_findings = _run_tool_for_agent(agent, code, language)

    tool_section = ""
    if tool_findings:
        tool_section = (
            "\nDeterministic tool findings (verify or reject each):\n"
            + json.dumps(tool_findings, indent=2)
            + "\n"
        )

    user_prompt = _build_code_prompt(
        language,
        code,
        extra=f"Focus notes from planner: {focus_notes}{tool_section}"
    )

    system_prompt = AGENT_PROMPTS[agent]
    content = call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_format="json_object"
    )
    data = _safe_json_loads(content, {"findings": []})

    findings = data.get("findings", [])
    if not isinstance(findings, list):
        findings = []

    logger.info("Agent %s returned %d findings", agent, len(findings))
    return findings


def _run_critic(
    all_findings: dict[str, list[dict]],
    language: str
) -> dict:
    user_prompt = f"""Programming Language: {language}

Findings by category:
{json.dumps(all_findings, indent=2)}
"""
    content = call_llm(
        system_prompt=CRITIC_PROMPT,
        user_prompt=user_prompt,
        response_format="json_object"
    )
    data = _safe_json_loads(content, {})

    if "reviews" not in data or not isinstance(data["reviews"], dict):
        data["reviews"] = {
            "bug": [],
            "security": [],
            "performance": [],
            "best_practice": []
        }

    return data


def review_agentic(code: str, language: str) -> dict:
    """
    Run the multi-step agentic review pipeline.

    Returns the same response envelope as the classic pipeline:
    {success, language, overall_score, summary, reviews}.
    """

    logger.info("Starting agentic review for language=%s", language)

    llm_calls = 0

    # 1. Planner
    relevant_agents, focus_notes = _run_planner(code, language)
    llm_calls += 1

    # 2. Specialist agents
    all_findings: dict[str, list[dict]] = {}
    for agent in relevant_agents:
        findings = _run_specialist(agent, code, language, focus_notes)
        all_findings[agent] = findings
        llm_calls += 1

    # Ensure every category exists even if planner skipped it
    for category in ("bug", "security", "performance", "best_practice"):
        all_findings.setdefault(category, [])

    # 3. Critic
    critic_result = _run_critic(all_findings, language)
    llm_calls += 1

    summary = critic_result.get("summary", "")
    reviews = critic_result.get("reviews", {})

    # 4. Normalize with existing validators
    validated_reviews = {
        "bug": validate_bug_review(reviews.get("bug", [])),
        "security": validate_security_review(reviews.get("security", [])),
        "performance": validate_performance_review(reviews.get("performance", [])),
        "best_practice": validate_best_practice_review(reviews.get("best_practice", []))
    }

    # 5. Score
    score = calculate_score(validated_reviews)

    logger.info(
        "Agentic review complete: llm_calls=%d score=%d",
        llm_calls,
        score
    )

    return {
        "success": True,
        "language": language,
        "overall_score": score,
        "summary": summary,
        "reviews": validated_reviews
    }
