SEVERITY_POINTS = {
    "Critical": 30,
    "High": 20,
    "Medium": 10,
    "Low": 5
}


def calculate_score(reviews):

    score = 100

    for findings in reviews.values():

        for item in findings:

            severity = item.get("severity")

            score -= SEVERITY_POINTS.get(
                severity,
                0
            )

    return max(score, 0)