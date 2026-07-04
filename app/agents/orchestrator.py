from app.ai import review_code

from app.agents.bug import validate_bug_review
from app.agents.security import validate_security_review
from app.agents.performance import validate_performance_review
from app.agents.best_practice import validate_best_practice_review
from app.agents.score_engine import calculate_score


def review(code: str, language: str):

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

    score = calculate_score(
        validated_reviews
    )
    print("Validated Reviews:")
    print(validated_reviews)

    print("Calculated Score:", score)

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