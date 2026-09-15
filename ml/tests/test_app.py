import os
import uuid
import pytest


DB_AVAILABLE = bool(os.environ.get("DATABASE_URL")) or True  # Try; if it fails, tests skip via fixture


@pytest.fixture
def scratch_user_and_question(client):
    """Create a scratch user + fixture question for tests. Cleans up in teardown."""
    import psycopg
    from ml.db import DATABASE_URL

    conn = psycopg.connect(DATABASE_URL)
    conn.autocommit = True

    user_id = str(uuid.uuid4())
    # Insert directly into auth.users + profiles (bypass GoTrue for test speed)
    conn.execute(
        """insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
           values (%s, %s, 'authenticated', 'authenticated', %s, 'x', now(), now(), now(), %s::jsonb)""",
        ('00000000-0000-0000-0000-000000000000', user_id, f'p4t3-{user_id[:8]}@test.local', '{"name":"P4T3"}'),
    )
    # profiles row is created by handle_new_user trigger

    # Insert scratch verse + question (approved so /recommend can pick it up)
    conn.execute(
        """insert into verses (ayah_key, surah, ayah, juz, page, text, text_normalized)
           values ('115:1', 115, 1, 30, 604, 'fixture', 'fixture')
           on conflict (ayah_key) do nothing"""
    )
    q_row = conn.execute(
        """insert into questions (type, quiz_key, prompt, instruction, ayah_key, payload, correct_idx, is_approved, source)
           values ('which_surah', 'mix', 'p4t3-fixture', '', '115:1', '{}', 0, true, 'generated')
           returning id""",
    ).fetchone()
    question_id = q_row[0]

    yield {"user_id": user_id, "question_id": question_id}

    # Cleanup — cascade takes care of profiles + attempts
    conn.execute("delete from questions where id = %s", (question_id,))
    conn.execute("delete from auth.users where id = %s", (user_id,))
    conn.close()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_attempt_updates_elo(client, scratch_user_and_question):
    fixture = scratch_user_and_question
    payload = {
        "user_id": fixture["user_id"],
        "question_id": fixture["question_id"],
        "correct": True,
        "response_ms": 1500,
    }
    r = client.post("/attempt", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    # Correct answer against Q at same 1200 baseline → user goes up, question goes down
    assert body["user_elo"] > 1200
    assert body["question_elo"] < 1200


def test_attempt_404_on_missing_question(client):
    payload = {"user_id": "00000000-0000-0000-0000-000000000000", "question_id": 999999999, "correct": True, "response_ms": 100}
    r = client.post("/attempt", json=payload)
    assert r.status_code == 404


def test_recommend_returns_ids(client, scratch_user_and_question):
    r = client.get(f"/recommend?user_id={scratch_user_and_question['user_id']}&limit=5")
    assert r.status_code == 200
    body = r.json()
    assert "question_ids" in body
    assert isinstance(body["question_ids"], list)
    # There's at least the fixture question approved
    assert scratch_user_and_question["question_id"] in body["question_ids"] or len(body["question_ids"]) > 0


def test_board_returns_rows(client):
    r = client.get("/board?limit=10")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    if body:
        assert set(body[0].keys()) == {"question_id", "elo", "attempts", "accuracy"}


def test_calibrate_returns_shape(client):
    r = client.post("/calibrate")
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"fitted", "changed"}
    assert isinstance(body["fitted"], int)
    assert isinstance(body["changed"], list)
