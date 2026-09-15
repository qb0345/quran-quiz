import os
from psycopg_pool import ConnectionPool

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:54622/postgres",
)

pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=5, open=True)


def health() -> dict:
    with pool.connection() as conn:
        cur = conn.execute("select 1")
        row = cur.fetchone()
        return {"db": "up" if row and row[0] == 1 else "down"}
