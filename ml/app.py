from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .db import health as db_health, pool
from .elo import update, INITIAL
from .recommend import rank_top_n
from .irt import fit, band_by_quantile

app = FastAPI(title="quran-quiz ML", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", **db_health()}


class AttemptIn(BaseModel):
    user_id: str
    question_id: int
    correct: bool
    response_ms: int


class AttemptOut(BaseModel):
    user_elo: float
    question_elo: float


@app.post("/attempt", response_model=AttemptOut)
def attempt(a: AttemptIn) -> AttemptOut:
    with pool.connection() as conn:
        u = conn.execute("select skill_elo from profiles where id = %s", (a.user_id,)).fetchone()
        q = conn.execute("select elo from questions where id = %s", (a.question_id,)).fetchone()
        if not u or not q:
            raise HTTPException(404, "user or question not found")
        attempts_so_far = conn.execute(
            "select count(*) from attempts where question_id = %s",
            (a.question_id,),
        ).fetchone()[0]
        new_u, new_q = update(float(u[0]), float(q[0]), a.correct, attempts_so_far)
        conn.execute("update profiles set skill_elo = %s where id = %s", (new_u, a.user_id))
        conn.execute("update questions set elo = %s where id = %s", (new_q, a.question_id))
        conn.commit()
        return AttemptOut(user_elo=new_u, question_elo=new_q)


@app.get("/recommend")
def recommend(user_id: str, quiz_key: str = "mix", limit: int = 10) -> dict:
    with pool.connection() as conn:
        u = conn.execute("select skill_elo from profiles where id = %s", (user_id,)).fetchone()
        user_elo = float(u[0]) if u else INITIAL
        rows = conn.execute(
            """
            select q.id, q.elo,
              (select extract(day from now() - max(a.ts))::int
                 from attempts a
                 where a.question_id = q.id and a.user_id = %s) as days_since_last,
              exists (
                select 1 from quiz_results r
                join attempts a on a.user_id = r.user_id and a.ts >= r.ts - interval '2 minute' and a.ts <= r.ts + interval '10 minute'
                where a.question_id = q.id
                  and r.user_id = %s
                  and r.ts > now() - interval '3 days'
              ) as in_recent_sessions
            from questions q
            where q.is_approved = true
            """,
            (user_id, user_id),
        ).fetchall()
    questions = [
        {
            "id": r[0],
            "elo": float(r[1]),
            "days_since_last": int(r[2]) if r[2] is not None else None,
            "in_recent_sessions": bool(r[3]),
        }
        for r in rows
    ]
    ids = rank_top_n(user_elo, questions, limit)
    return {"question_ids": ids}


@app.get("/board")
def board(limit: int = 100) -> list[dict]:
    with pool.connection() as conn:
        rows = conn.execute(
            """
            select q.id, q.elo, count(a.id) as attempts,
              coalesce(avg(case when a.correct then 1.0 else 0.0 end), 0) as accuracy
            from questions q
            left join attempts a on a.question_id = q.id
            where q.is_approved = true
            group by q.id, q.elo
            order by q.elo desc
            limit %s
            """,
            (limit,),
        ).fetchall()
    return [
        {"question_id": r[0], "elo": float(r[1]), "attempts": int(r[2]), "accuracy": float(r[3])}
        for r in rows
    ]


@app.post("/calibrate")
def calibrate() -> dict:
    with pool.connection() as conn:
        rows = conn.execute("select user_id::text, question_id, correct from attempts").fetchall()
        attempts = [{"user_id": r[0], "question_id": r[1], "correct": r[2]} for r in rows]
        if not attempts:
            return {"fitted": 0, "changed": []}
        difficulties = fit(attempts)
        bands = band_by_quantile(difficulties, 5)
        changed: list[dict] = []
        for qid, new_band in bands.items():
            prev = conn.execute("select band from questions where id = %s", (qid,)).fetchone()
            if prev and prev[0] != new_band:
                conn.execute("update questions set band = %s where id = %s", (new_band, qid))
                changed.append({"question_id": qid, "band_before": int(prev[0]), "band_after": int(new_band)})
        conn.commit()
    return {"fitted": len(difficulties), "changed": changed}
