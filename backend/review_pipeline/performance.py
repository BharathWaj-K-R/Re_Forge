VALID_SEVERITIES = {
    "Critical",
    "High",
    "Medium",
    "Low"
}


def validate_performance_review(review: list):

    validated = []

    for item in review:

        validated.append(
            {
                "severity": item.get("severity", "Low")
                if item.get("severity") in VALID_SEVERITIES
                else "Low",

                "title": item.get("title", ""),

                "description": item.get("description", ""),

                "recommendation": item.get("recommendation", "")
            }
        )

    return validated