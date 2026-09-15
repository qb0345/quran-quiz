import pytest
from ml.elo import expected, k_question, update, MAX_ELO, MIN_ELO


def test_expected_symmetric():
    assert expected(1200, 1200) == pytest.approx(0.5)


def test_expected_harder_question():
    assert expected(1200, 1400) < 0.5


def test_expected_easier_question():
    assert expected(1600, 1200) > 0.5


def test_update_correct_upset():
    """User beats harder question — user elo should rise."""
    new_u, new_q = update(1200, 1400, correct=True, attempts_so_far=0)
    assert new_u > 1200


def test_update_incorrect_expected_win():
    """User misses easy question — user elo should fall."""
    new_u, new_q = update(1200, 800, correct=False, attempts_so_far=0)
    assert new_u < 1200


def test_k_question_thresholds():
    assert k_question(0) == 32.0
    assert k_question(29) == 32.0
    assert k_question(30) == 16.0
    assert k_question(1000) == 16.0


def test_clamp_at_max():
    """Starting already at MAX should stay at MAX after a correct answer."""
    u, q = MAX_ELO, MIN_ELO
    for _ in range(5):
        u, q = update(u, q, correct=True, attempts_so_far=0)
    assert u == MAX_ELO


def test_bounded_growth():
    """User elo must never exceed MAX_ELO regardless of win streak length."""
    u, q = 1200.0, 1200.0
    for _ in range(500):
        u, q = update(u, q, correct=True, attempts_so_far=0)
    # Elo is bounded — clamp is enforced every step
    assert u <= MAX_ELO
    assert q >= MIN_ELO
