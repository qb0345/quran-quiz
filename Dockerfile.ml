FROM python:3.12-slim
WORKDIR /app

# Original pins from Phase 4 spec (Docker uses 3.12 where cp312 wheels exist).
# The local dev on Python 3.14 required version bumps documented in the P4T1 commit.
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    "uvicorn[standard]==0.30.6" \
    "psycopg[binary]==3.2.3" \
    psycopg-pool==3.2.3 \
    scikit-learn==1.5.2 \
    numpy==1.26.4 \
    pydantic==2.9.2

COPY ml/ ./ml/
EXPOSE 8400
CMD ["python", "-m", "uvicorn", "ml.app:app", "--host", "0.0.0.0", "--port", "8400"]
