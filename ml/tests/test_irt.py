import random
import pytest
from ml.irt import fit, band_by_quantile


def test_fit_empty():
    assert fit([]) == {}


def test_fit_difficulty_ordering():
    """
    3 users, 3 questions.
    q1 always answered correctly by all users.
    q3 always answered incorrectly by all users.
    q2 is mixed.
    After fitting, difficulty(q3) > difficulty(q1).
    """
    random.seed(42)
    attempts = []
    users = ["u1", "u2", "u3"]
    # Generate ~30 attempts
    for _ in range(10):
        for u in users:
            attempts.append({"user_id": u, "question_id": 1, "correct": True})
            attempts.append({"user_id": u, "question_id": 2, "correct": random.random() > 0.5})
            attempts.append({"user_id": u, "question_id": 3, "correct": False})

    fitted = fit(attempts)
    assert set(fitted.keys()) == {1, 2, 3}
    assert fitted[3] > fitted[1], (
        f"Expected q3 harder than q1, got q3={fitted[3]:.3f}, q1={fitted[1]:.3f}"
    )


def test_band_by_quantile_distinct_bands():
    """5 items, 5 bands — each item should get a distinct band 1..5."""
    difficulties = {1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.5}
    bands = band_by_quantile(difficulties, n_bands=5)
    assert set(bands.values()) == {1, 2, 3, 4, 5}


def test_band_by_quantile_fallback():
    """Fewer items than bands → all get band 3."""
    difficulties = {1: 0.1, 2: 0.2}
    bands = band_by_quantile(difficulties, n_bands=5)
    assert bands == {1: 3, 2: 3}
