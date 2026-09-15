K_USER = 24.0
INITIAL = 1200.0
MIN_ELO = 400.0
MAX_ELO = 2800.0


def expected(user_elo: float, question_elo: float) -> float:
    """Probability user answers correctly."""
    return 1.0 / (1.0 + 10 ** ((question_elo - user_elo) / 400.0))


def k_question(attempts_so_far: int) -> float:
    """K factor for the question side: 32 while <30 attempts, else 16."""
    return 32.0 if attempts_so_far < 30 else 16.0


def _clamp(x: float) -> float:
    return max(MIN_ELO, min(MAX_ELO, x))


def update(
    user_elo: float,
    question_elo: float,
    correct: bool,
    attempts_so_far: int,
) -> tuple[float, float]:
    """
    Returns (new_user_elo, new_question_elo) after applying the attempt.
    Symmetric zero-sum on the raw update; clamped to [400, 2800].
    """
    s = 1.0 if correct else 0.0
    e_u = expected(user_elo, question_elo)
    new_u = user_elo + K_USER * (s - e_u)
    new_q = question_elo + k_question(attempts_so_far) * (e_u - s)
    return _clamp(new_u), _clamp(new_q)
