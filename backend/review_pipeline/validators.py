VALID_SEVERITIES = {"Critical", "High", "Medium", "Low"}


def validate(category: str, items: list) -> list:
    """Normalize review findings for any category (bug, security, performance, best_practice)."""
    validated = []
    for item in items:
        validated.append({
            "severity": item.get("severity", "Low") if item.get("severity") in VALID_SEVERITIES else "Low",
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "recommendation": item.get("recommendation", ""),
        })
    return validated
