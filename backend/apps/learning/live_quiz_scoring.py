"""
Canonical live-quiz scoring — the single source of truth used by BOTH the REST
submission path (views_live_quiz.py) and the WebSocket path (consumers.py), so
identical answers always earn identical points. (Remediation Req 9.)

Convention (bounded at full points):
  * A fully-correct answer earns base 50% of the question's points plus up to a
    further 50% time bonus — never more than the full points.
  * A partially-correct coding answer earns points proportional to tests passed.
"""


def _full_credit_points(question, response_time) -> int:
    """Points for a fully-correct answer: 50% base + up to 50% time bonus."""
    base = question.points
    if not question.time_bonus_enabled or not question.time_limit:
        return base
    time_pct = max(0.0, (question.time_limit - response_time) / question.time_limit)
    return int(base * 0.5 + base * 0.5 * time_pct)


def score_mcq(question, answer_text, response_time):
    """Score a multiple-choice / true-false / short-answer response."""
    is_correct = (answer_text or '').strip().upper() == (question.correct_answer or '').strip().upper()
    points = _full_credit_points(question, response_time) if is_correct else 0
    return is_correct, points


def score_coding(question, exec_result, response_time):
    """Score a coding response from a CodeExecutor result dict."""
    total = exec_result.get('total', 0) or 0
    passed = exec_result.get('passed', 0) or 0
    all_passed = bool(exec_result.get('all_passed', False))
    if all_passed:
        points = _full_credit_points(question, response_time)
    else:
        pass_ratio = (passed / total) if total else 0
        points = int(question.points * pass_ratio)
    return all_passed, points
