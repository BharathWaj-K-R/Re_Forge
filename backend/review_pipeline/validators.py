VALID_SEVERITIES = {"Critical", "High", "Medium", "Low"}


def validate(category, items):
    """Keep only the fields the frontend and score engine understand."""
    if not isinstance(items, list):
        return []

    validated = []
    for item in items:
        if not isinstance(item, dict):
            continue

        severity = item.get("severity")
        if severity not in VALID_SEVERITIES:
            severity = "Low"

        validated.append(
            {
                "severity": severity,
                "title": str(item.get("title") or ""),
                "description": str(item.get("description") or ""),
                "recommendation": str(item.get("recommendation") or ""),
            }
        )

    return validated
