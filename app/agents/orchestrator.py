import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError

from app.ai import review_code
from app.config import AGENT_MODE, AGENT_TIMEOUT_SECONDS

from app.agents.agentic_orchestrator import review_agentic
from app.agents.best_practice import validate_best_practice_review
from app.agents.bug import validate_bug_review
from app.agents.performance import validate_performance_review
from app.agents.score_engine import calculate_score
from app.agents.security import validate_security_review

logger = logging.getLogger(__name__)


def review_classic(code: str, language: str):
    """
    Original single-call review pipeline.

    Kept intact as the safety-net path.
    """

    ai_result = review_code(
        language=language,
        code=code
    )

    reviews = ai_result.get("reviews", {})

    validated_reviews = {
        "bug": validate_bug_review(
            reviews.get("bug", [])
        ),
        "security": validate_security_review(
            reviews.get("security", [])
        ),
        "performance": validate_performance_review(
            reviews.get("performance", [])
        ),
        "best_practice": validate_best_practice_review(
            reviews.get("best_practice", [])
        )
    }

    score = calculate_score(validated_reviews)

    logger.info("Classic review: mode=classic score=%d", score)

    return {
        "success": True,
        "language": language,
        "overall_score": score,
        "summary": ai_result.get(
            "summary",
            ""
        ),
        "reviews": validated_reviews
    }


def _run_agentic_with_timeout(code: str, language: str, timeout: float):
    """
    Run the agentic pipeline in a worker thread so we can enforce a timeout.

    Falls back to a TimeoutError if the pipeline exceeds the budget.
    """

    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(review_agentic, code, language)
        return future.result(timeout=timeout)


def review(code: str, language: str):
    """
    Dispatch to the classic or agentic pipeline based on AGENT_MODE.

    If agentic mode is enabled and the pipeline fails or times out,
    automatically fall back to the classic path for that request.
    """

    logger.info("Review request: mode=%s", AGENT_MODE)

    if AGENT_MODE != "agentic":
        return review_classic(code, language)

    try:
        return _run_agentic_with_timeout(
            code,
            language,
            timeout=AGENT_TIMEOUT_SECONDS
        )
    except TimeoutError:
        logger.warning(
            "Agentic pipeline timed out after %ss, falling back to classic",
            AGENT_TIMEOUT_SECONDS
        )
        return review_classic(code, language)
    except Exception as e:
        logger.warning(
            "Agentic pipeline failed, falling back to classic: %s",
            e
        )
        return review_classic(code, language)
