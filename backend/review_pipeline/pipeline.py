"""Code review orchestration.

The pipeline has three responsibilities:
1. Ask a planner which review areas matter.
2. Run the selected specialists and give them deterministic checks.
3. Critique, normalize, and score the findings.

The deterministic tools and score calculation stay outside the LLM so the
application still has useful behavior when the model service fails.
"""

import json
import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError, as_completed

from backend.ai import call_llm
from backend.config import AGENT_TIMEOUT_SECONDS
from backend.review_pipeline.prompts import (
    BEST_PRACTICE_AGENT_PROMPT,
    BUG_AGENT_PROMPT,
    CRITIC_PROMPT,
    PERFORMANCE_AGENT_PROMPT,
    PLANNER_PROMPT,
    SECURITY_AGENT_PROMPT,
)
from backend.review_pipeline.score import calculate_score
from backend.review_pipeline.tools import (
    ast_quick_check,
    detect_hardcoded_secrets,
    detect_infinite_loops,
)
from backend.review_pipeline.validators import validate

logger = logging.getLogger(__name__)

AGENT_PROMPTS = {
    "bug": BUG_AGENT_PROMPT,
    "security": SECURITY_AGENT_PROMPT,
    "performance": PERFORMANCE_AGENT_PROMPT,
    "best_practice": BEST_PRACTICE_AGENT_PROMPT,
}
ALL_CATEGORIES = tuple(AGENT_PROMPTS)


def _empty_reviews():
    return {category: [] for category in ALL_CATEGORIES}


def _parse_json(content, default):
    try:
        data = json.loads(content)
        return data if isinstance(data, dict) else default
    except (json.JSONDecodeError, TypeError):
        logger.warning("LLM returned invalid JSON")
        return default


def _code_prompt(language, code, context=""):
    prompt = f"Programming Language: {language}\n\nCode:\n{code}"
    if context:
        prompt += f"\n\nAdditional Context:\n{context}"
    return prompt


def _select_agents(code, language):
    data = _parse_json(
        call_llm(
            system_prompt=PLANNER_PROMPT,
            user_prompt=_code_prompt(language, code),
            response_format="json_object",
        ),
        {},
    )

    selected = [
        agent
        for agent in data.get("relevant_agents", [])
        if agent in AGENT_PROMPTS
    ]
    return selected or list(ALL_CATEGORIES), data.get("focus_notes", "")


def _tool_findings(agent, code, language):
    if agent == "bug":
        return ast_quick_check(code, language)
    if agent == "security":
        return detect_hardcoded_secrets(code)
    if agent == "performance":
        return detect_infinite_loops(code, language)
    return []


def _run_specialist(agent, code, language, focus):
    findings = _tool_findings(agent, code, language)
    tool_context = ""
    if findings:
        tool_context = (
            "Deterministic checks found the following. Verify or reject them:\n"
            + json.dumps(findings, indent=2)
        )

    data = _parse_json(
        call_llm(
            system_prompt=AGENT_PROMPTS[agent],
            user_prompt=_code_prompt(
                language,
                code,
                f"Focus from planner: {focus}\n{tool_context}",
            ),
            response_format="json_object",
        ),
        {"findings": []},
    )

    result = data.get("findings", [])
    return result if isinstance(result, list) else []


def _run_specialists(agents, code, language, focus):
    results = _empty_reviews()

    with ThreadPoolExecutor(max_workers=len(agents)) as executor:
        futures = {
            executor.submit(_run_specialist, agent, code, language, focus): agent
            for agent in agents
        }

        for future in as_completed(futures):
            agent = futures[future]
            try:
                results[agent] = future.result()
                logger.info("%s specialist returned %d findings", agent, len(results[agent]))
            except Exception:
                logger.exception("%s specialist failed", agent)

    return results


def _local_review(code, language):
    reviews = _empty_reviews()
    reviews["bug"] = ast_quick_check(code, language)
    reviews["security"] = detect_hardcoded_secrets(code)
    reviews["performance"] = detect_infinite_loops(code, language)
    reviews = {category: validate(category, items) for category, items in reviews.items()}

    score = calculate_score(reviews)
    has_findings = any(reviews.values())

    return {
        "success": True,
        "language": language,
        "overall_score": score,
        "summary": (
            "Local checks completed. External AI review was unavailable."
            if not has_findings
            else "External AI review was unavailable, so only deterministic findings are shown."
        ),
        "reviews": reviews,
        "review_mode": "local_fallback",
    }


def _critic(findings, language):
    data = _parse_json(
        call_llm(
            system_prompt=CRITIC_PROMPT,
            user_prompt=(
                f"Programming Language: {language}\n\n"
                f"Findings by category:\n{json.dumps(findings, indent=2)}"
            ),
            response_format="json_object",
        ),
        {},
    )

    reviews = data.get("reviews")
    if not isinstance(reviews, dict):
        raise ValueError("Critic response did not contain a reviews object")

    return data.get("summary", ""), reviews


def _agentic_review(code, language):
    try:
        agents, focus = _select_agents(code, language)
    except Exception:
        logger.exception("Planner failed; reviewing all categories")
        agents, focus = list(ALL_CATEGORIES), "Perform a broad review."

    findings = _run_specialists(agents, code, language, focus)

    if not any(findings.values()):
        return _local_review(code, language)

    try:
        summary, reviews = _critic(findings, language)
    except Exception:
        logger.exception("Critic failed; keeping specialist findings")
        summary = "Review completed using the available specialist findings."
        reviews = findings

    reviews = {
        category: validate(category, reviews.get(category, []))
        for category in ALL_CATEGORIES
    }

    return {
        "success": True,
        "language": language,
        "overall_score": calculate_score(reviews),
        "summary": summary,
        "reviews": reviews,
    }


def _run_with_timeout(code, language):
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_agentic_review, code, language)
    try:
        return future.result(timeout=AGENT_TIMEOUT_SECONDS)
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def review(code, language):
    """Public entry point used by the API."""
    try:
        return _run_with_timeout(code, language)
    except TimeoutError:
        logger.warning("Review timed out; using local checks")
        return _local_review(code, language)
    except Exception:
        logger.exception("Review failed; using local checks")
        return _local_review(code, language)
