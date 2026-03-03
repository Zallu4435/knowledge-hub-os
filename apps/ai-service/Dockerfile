# ============================================================
# Dockerfile — ai-service (Python/FastAPI)  |  Build context: repo ROOT
# ============================================================
FROM python:3.11-slim

WORKDIR /app

# Install build tools needed by some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker layer cache — only rebuilds on change)
COPY apps/ai-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source files
# libs/event_schemas is imported as "from libs.event_schemas..."
COPY libs/event_schemas/ ./libs/event_schemas/
COPY apps/ai-service/ ./apps/ai-service/

# PYTHONPATH=/app makes "from libs.event_schemas..." resolve to /app/libs/event_schemas
ENV PYTHONPATH=/app

# Work from the service directory so "import main" works
WORKDIR /app/apps/ai-service

# Render injects PORT env var; uvicorn reads it here
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
