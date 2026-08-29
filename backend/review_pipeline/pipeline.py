"""
Unified review pipeline for ReForge.

Flow:
  1. Planner decides which specialist agents are relevant.
  2. Specialist agents run concurrently, each with one deterministic tool.
  3. Critic deduplicates and filters all findings when available.
  4. Validators normalize output.
  5. Deterministic score engine calculates the final score.

The pipeline is deliberately defensive because the review endpoint is a
user-facing production path. A single failed specialist or critic should not
turn the entire request into a zero-value failure when useful findings are
already available. If the external LLM service is unavailable, the existing
deterministic analyzers provide a local fallback instead of returning an
unhelpful zero-score error to the user.
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
from backend.review_pipeline.tools import (
    ast_quick_check,
    detect_hardcoded_secrets,
    detect_infinite_loops,
)
from backend.review_pipeline.validators import validate
from backend.review_pipeline.score import calculate_score

logger = logging.getLogger(__name__)

AGENT_PROMPTS = {
    "bug": BUG_AGENT_PROMPT,
    "security": SECURITY_AGENT_PROMPT,
    "performance": PERFORMANCE_AGENT_PROMPT,
    "best_practice": BEST_PRACTICE_AGENT_PROMPT,
}
ALL_CATEGORIES = ("bug", "security", "performance", "best_practice")


def _empty_reviews() -> dict[str, list[dict]]:
    return {category: [] for category in ALL_CATEGORIES}


def _safe_json_loads(text: str, default=None):
    if default is None:
        default = {}
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError) as e:
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

    allowed = set(AGENT_PROMPTS)
    relevant = [
        agent for agent in data.get("relevant_agents", [])
        if agent in allowed
    ]

    if not relevant:
        relevant = list(ALL_CATEGORIES)

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


def _run_specialist_safe(
    agent: str,
    code: str,
    language: str,
    focus_notes: str,
) -> tuple[str, list[dict], bool]:
    """Run one specialist without allowing its failure to abort the batch."""
    try:
        return agent, _run_specialist(agent, code, language, focus_notes), True
    except Exception as exc:
        logger.exception("Specialist agent %s failed: %s", agent, exc)
        return agent, [], False


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
        data["reviews"] = _empty_reviews()

    return data


def _run_critic_safe(
    all_findings: dict[str, list[dict]],
    language: str,
) -> dict | None:
    try:
        return _run_critic(all_findings, language)
    except Exception as exc:
        logger.exception("Critic agent failed: %s", exc)
        return None


def _run_local_fallback(code: str, language: str) -> dict:
    """Produce a useful review without any external LLM dependency."""
    fallback_reviews = _empty_reviews()

    # Reuse the deterministic analyzers already shipped with ReForge. This is
    # intentionally conservative: it reports only issues the local tools can
    # establish without guessing what the code means.
    fallback_reviews["bug"].extend(ast_quick_check(code, language))
    fallback_reviews["security"].extend(detect_hardcoded_secrets(code))
    fallback_reviews["performance"].extend(detect_infinite_loops(code, language))

    validated_reviews = {
        category: validate(category, fallback_reviews[category])
        for category in ALL_CATEGORIES
    }
    score = calculate_score(validated_reviews)

    has_findings = any(validated_reviews.values())
    summary = (
        "Limited local review completed. External AI review was unavailable."
        if not has_findings
        else "Local safety checks completed. External AI review was unavailable, so only deterministic findings are shown."
    )

    logger.warning("Using deterministic local fallback review; score=%d", score)

    return {
        "success": True,
        "language": language,
        "overall_score": score,
        "summary": summary,
        "reviews": validated_reviews,
        "review_mode": "local_fallback",
    }


def _run_agentic(code: str, language: str) -> dict:
    """
    Run the multi-step agentic review pipeline.

    Specialist agents execute concurrently so a four-agent review does not
    unnecessarily serialize four network-bound LLM calls on a Render worker.
    """

    logger.info("Starting agentic review for language=%s", language)

    # Planner failure should not make the endpoint unusable. In that case run
    # every specialist, which preserves the core review capability.
    try:
        relevant_agents, focus_notes = _run_planner(code, language)
    except Exception as exc:
        logger.exception("Planner failed; running all specialists: %s", exc)
        relevant_agents = list(ALL_CATEGORIES)
        focus_notes = "Planner unavailable. Perform a broad review."

    all_findings = _empty_reviews()
    completed_agents = 0

    with ThreadPoolExecutor(max_workers=max(1, len(relevant_agents))) as executor:
        futures = {
            executor.submit(
                _run_specialist_safe,
                agent,
                code,
                language,
                focus_notes,
            ): agent
            for agent in relevant_agents
        }

        for future in as_completed(futures):
            agent, findings, succeeded = future.result()
            all_findings[agent] = findings
            if succeeded:
                completed_agents += 1

    critic_result = _run_critic_safe(all_findings, language)

    if critic_result is not None:
        summary = critic_result.get("summary", "")
        reviews = critic_result.get("reviews", {})
        if not isinstance(reviews, dict):
            reviews = all_findings
    else:
        summary = (
            "Review completed using the specialist findings. "
            "The final critic pass was unavailable."
        )
        reviews = all_findings

    validated_reviews = {
        category: validate(category, reviews.get(category, []))
        for category in ALL_CATEGORIES
    }

    score = calculate_score(validated_reviews)

    logger.info(
        "Agentic review complete: specialists=%d/%d critic=%s score=%d",
        completed_agents,
        len(relevant_agents),
        critic_result is not None,
        score,
    )

    # If every external LLM call failed, switch to the deterministic local
    # fallback rather than returning a zero-score API failure.
    if completed_agents == 0 and critic_result is None:
        return _run_local_fallback(code, language)

    return {
        "success": True,
        "language": language,
        "overall_score": score,
        "summary": summary,
        "reviews": validated_reviews
    }


def _run_agentic_with_timeout(code: str, language: str, timeout: float):
    """
    Run the agentic pipeline in a worker thread with a real timeout.

    The previous context-manager implementation waited for the worker during
    executor shutdown even after timeout, defeating the point of the timeout
    guard. This implementation returns promptly once the deadline is hit.
    """
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_run_agentic, code, language)
    try:
        return future.result(timeout=timeout)
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def review(code: str, language: str):
    """
    Public entry point called by routes.py.

    Runs the agentic pipeline with a timeout guard and always converts failures
    into the existing stable response envelope instead of leaking exceptions.
    """

    logger.info("Review request for language=%s", language)

    try:
        return _run_agentic_with_timeout(
            code,
            language,
            timeout=AGENT_TIMEOUT_SECONDS
        )
    except TimeoutError:
        logger.warning(
            "Agentic pipeline timed out after %ss; using local fallback",
            AGENT_TIMEOUT_SECONDS
        )
        return _run_local_fallback(code, language)
    except Exception as exc:
        logger.exception("Agentic pipeline failed: %s; using local fallback", exc)
        return _run_local_fallback(code, language)
