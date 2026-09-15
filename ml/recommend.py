from typing import Optional
from .elo import expected


def score_question(
    user_elo: float,
    question_elo: float,
    days_since_last: Optional[int],
    in_recent_sessions: bool,
) -> float:
    """
    score(q) = P_incorrect(q) × recency × exposure
    - P_incorrect = 1 - expected(u, q)
    - recency = min(days_since_last, 30) / 30 (None => 1.0, never attempted)
    - exposure = 0.5 if attempted in user's last 3 sessions, else 1.0
    """
    p_incorrect = 1.0 - expected(user_elo, question_elo)
    recency = 1.0 if days_since_last is None else min(days_since_last, 30) / 30.0
    exposure = 0.5 if in_recent_sessions else 1.0
    return p_incorrect * recency * exposure


def rank_top_n(user_elo: float, questions: list[dict], n: int) -> list[int]:
    """
    questions: [{id, elo, days_since_last, in_recent_sessions}, ...]
    Returns question ids ranked by score desc, top N.
    """
    scored = [
        (
            q["id"],
            score_question(
                user_elo,
                q["elo"],
                q.get("days_since_last"),
                q.get("in_recent_sessions", False),
            ),
        )
        for q in questions
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [qid for qid, _ in scored[:n]]
