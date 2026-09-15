import numpy as np
from sklearn.linear_model import LogisticRegression


def fit(attempts: list[dict]) -> dict[int, float]:
    """
    Fit item-response-theory (1PL / Rasch-like) via logistic regression.
    P(correct) = sigmoid(theta_u - b_j)

    attempts: [{"user_id": str, "question_id": int, "correct": bool}, ...]
    Returns: {question_id: b_j (fitted difficulty)}
    """
    if not attempts:
        return {}
    users = sorted({a["user_id"] for a in attempts})
    questions = sorted({a["question_id"] for a in attempts})
    u_idx = {u: i for i, u in enumerate(users)}
    q_idx = {q: i for i, q in enumerate(questions)}
    n_features = len(users) + len(questions)

    X = np.zeros((len(attempts), n_features), dtype=np.float32)
    y = np.zeros(len(attempts), dtype=np.int32)
    for i, a in enumerate(attempts):
        X[i, u_idx[a["user_id"]]] = 1.0
        X[i, len(users) + q_idx[a["question_id"]]] = -1.0
        y[i] = 1 if a["correct"] else 0

    # No intercept (spec: sigmoid(theta - b), no bias term).
    # C very large = minimal regularization.
    model = LogisticRegression(fit_intercept=False, C=1e6, max_iter=1000)
    model.fit(X, y)
    coefs = model.coef_[0]
    # coefs[q_col] maps to b_j: large positive = hard (high barrier to answering correctly).
    # Encoding: X[q_col]=-1 => logit = theta_u - coef_q, so b_j = coef_q directly.
    return {q: float(coefs[len(users) + q_idx[q]]) for q in questions}


def band_by_quantile(difficulties: dict[int, float], n_bands: int = 5) -> dict[int, int]:
    """Assign 1..n_bands based on quantile. Ties broken by insertion order."""
    if not difficulties:
        return {}
    if len(difficulties) < n_bands:
        return {q: 3 for q in difficulties}
    vals = sorted(difficulties.values())
    # Cut positions for n_bands equal-count buckets
    cuts = [vals[int(len(vals) * (i + 1) / n_bands) - 1] for i in range(n_bands - 1)]

    def band_for(v: float) -> int:
        for i, c in enumerate(cuts):
            if v <= c:
                return i + 1
        return n_bands

    return {q: band_for(d) for q, d in difficulties.items()}
