#!/usr/bin/env bash
# ============================================================
# deploy.sh — Zero-downtime deploy script for Knowledge Hub OS
#
# Run on the Oracle Cloud VM after every new GitHub release.
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Prerequisites:
#   - Docker + Docker Compose plugin installed
#   - GHCR login: echo "$GHCR_TOKEN" | docker login ghcr.io -u $GITHUB_USER --password-stdin
#   - .env file present in the same directory
# ============================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

GITHUB_ORG="${GITHUB_ORG:-your-github-username}"  # Override via env or edit here
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "🚀 Starting deployment for Knowledge Hub OS"
log "   Project dir : $PROJECT_DIR"
log "   GitHub Org  : $GITHUB_ORG"

cd "$PROJECT_DIR"

# ── 1. Pull latest code ───────────────────────────────────────
log "📥 Pulling latest code from main branch..."
git fetch origin main
git reset --hard origin/main

# ── 2. Pull latest Docker images from GHCR ───────────────────
log "🐳 Pulling latest images from GHCR..."
GITHUB_ORG="$GITHUB_ORG" docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  pull --quiet

# ── 3. Rolling restart ────────────────────────────────────────
# Restart services one at a time to minimise downtime.
# Infrastructure (redpanda, redis) is only restarted if their
# image or config has changed.
log "🔄 Rolling restart of application services..."
for service in auth-service goal-service ai-service api-gateway frontend; do
  log "   Restarting $service..."
  GITHUB_ORG="$GITHUB_ORG" docker compose \
    -f docker-compose.yml \
    -f docker-compose.prod.yml \
    up -d --no-deps "$service"
  sleep 5  # Give each service 5s to initialise before the next one
done

# ── 4. Health check ───────────────────────────────────────────
log "🏥 Waiting for services to become healthy (up to 120s)..."
timeout 120 bash -c '
  until docker compose \
    -f docker-compose.yml \
    -f docker-compose.prod.yml \
    ps --format json | \
    python3 -c "
import sys, json
data = [json.loads(line) for line in sys.stdin if line.strip()]
unhealthy = [s[\"Service\"] for s in data if s.get(\"Health\") not in (\"healthy\", \"\", None)]
if unhealthy:
    print(f\"Still waiting: {unhealthy}\")
    sys.exit(1)
print(\"All services healthy!\")
"; do sleep 5; done
' || { log "❌ Health check timed out. Check: docker compose ps"; exit 1; }

# ── 5. Cleanup old images ─────────────────────────────────────
log "🧹 Cleaning up dangling images..."
docker image prune -f

log "✅ Deployment complete!"
log "   App:       http://$(curl -s ifconfig.me):4000"
log "   API:       http://$(curl -s ifconfig.me):3000"
log "   Grafana:   http://$(curl -s ifconfig.me):3030  (admin/admin)"
log "   Jaeger:    http://$(curl -s ifconfig.me):16686"
