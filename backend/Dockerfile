FROM python:3.11-slim AS builder

ENV POETRY_VIRTUALENVS_CREATE=false \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# Only copy dependency files first for better caching
COPY backend/requirements.txt .

# Build wheels for all deps
RUN pip install --upgrade pip wheel \
 && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ---- Runtime: minimal image with just what we need ----
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    GUNICORN_CMD_ARGS="--workers=4 --worker-class=uvicorn.workers.UvicornWorker --timeout=60 --graceful-timeout=30 --bind=0.0.0.0:8000"

# Runtime libs for Postgres, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -u 10001 -m appuser

WORKDIR /app

# Install Python deps from prebuilt wheels
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

# Copy application code
COPY backend/ ./

# Ensure writable key directory if you mount secrets there
RUN mkdir -p /etc/vaultx/keys && chown -R appuser:appuser /etc/vaultx /app

USER appuser

EXPOSE ${BACKEND_PORT:-8000}
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:${BACKEND_PORT:-8000}"]
