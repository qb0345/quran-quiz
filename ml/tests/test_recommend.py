import pytest
from ml.recommend import score_question, rank_top_n


USER_ELO = 1200.0
Q_ELO = 1200.0  # same level — P_incorrect == 0.5


def test_unseen_scores_higher_than_recent():
    """Unseen (days_since_last=None, recency=1.0) vs just-seen (days=0, recency=0.0)."""
    unseen = score_question(USER_ELO, Q_ELO, days_since_last=None, in_recent_sessions=False)
    just_seen = score_question(USER_ELO, Q_ELO, days_since_last=0, in_recent_sessions=False)
    assert unseen > just_seen


def test_harder_question_scores_higher():
    """Harder question (elo > user elo) has higher P_incorrect → higher score."""
    hard = score_question(USER_ELO, 1600.0, days_since_last=None, in_recent_sessions=False)
    easy = score_question(USER_ELO, 800.0, days_since_last=None, in_recent_sessions=False)
    assert hard > easy


def test_exposure_penalty_halves_score():
    """in_recent_sessions=True should be exactly half of False (same recency)."""
    score_with = score_question(USER_ELO, Q_ELO, days_since_last=None, in_recent_sessions=True)
    score_without = score_question(USER_ELO, Q_ELO, days_since_last=None, in_recent_sessions=False)
    assert score_with == pytest.approx(score_without * 0.5)


def test_recency_values():
    """Check recency scaling: 15 → 0.5, 30 → 1.0, 60 → 1.0 (capped)."""
    # score = p_incorrect * recency * exposure (exposure=1, p_incorrect same)
    base = score_question(USER_ELO, Q_ELO, days_since_last=30, in_recent_sessions=False)
    half = score_question(USER_ELO, Q_ELO, days_since_last=15, in_recent_sessions=False)
    cap = score_question(USER_ELO, Q_ELO, days_since_last=60, in_recent_sessions=False)
    assert half == pytest.approx(base * 0.5)
    assert cap == pytest.approx(base)


def test_rank_top_n_order_and_count():
    """rank_top_n returns top-N ids ordered by descending score."""
    questions = [
        {"id": 1, "elo": 800.0, "days_since_last": None, "in_recent_sessions": False},   # easy, high recency
        {"id": 2, "elo": 1600.0, "days_since_last": None, "in_recent_sessions": False},  # hard, high recency — highest score
        {"id": 3, "elo": 1200.0, "days_since_last": 0, "in_recent_sessions": True},      # mid, no recency, penalised
        {"id": 4, "elo": 1400.0, "days_since_last": 15, "in_recent_sessions": False},
        {"id": 5, "elo": 1000.0, "days_since_last": 30, "in_recent_sessions": False},
    ]
    top3 = rank_top_n(USER_ELO, questions, n=3)
    assert len(top3) == 3
    # q2 (hard + unseen) should be first
    assert top3[0] == 2
    # q3 (penalised recency=0 and exposure) should NOT appear in top 3
    assert 3 not in top3
