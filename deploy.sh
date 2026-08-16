#!/usr/bin/env bash
set -Eeuo pipefail

BASE="/opt/haymclub"
COMPOSE="$BASE/docker-compose.production.yml"

NEW_TAG="${1:-latest}"
PREVIOUS_TAG_FILE="$BASE/.previous-image-tag"
CURRENT_TAG_FILE="$BASE/.current-image-tag"

cd "$BASE"

CURRENT_TAG="latest"
if [ -f "$CURRENT_TAG_FILE" ]; then
  CURRENT_TAG="$(cat "$CURRENT_TAG_FILE")"
fi

echo "=== DEPLOY ==="
echo "CURRENT_TAG=$CURRENT_TAG"
echo "NEW_TAG=$NEW_TAG"

echo "$CURRENT_TAG" > "$PREVIOUS_TAG_FILE"

echo
echo "=== PRE-DEPLOY BACKUP ==="
"$BASE/backup.sh"

echo
echo "=== PULL IMAGES ==="

IMAGE_TAG="$NEW_TAG" \
docker compose \
  -f "$COMPOSE" \
  pull backend frontend

echo
echo "=== RUN MIGRATIONS ==="

IMAGE_TAG="$NEW_TAG" \
docker compose \
  -f "$COMPOSE" \
  run --rm \
  --no-deps \
  backend \
  node dist/src/database/run-migrations.js

echo
echo "=== UPDATE BACKEND ==="

IMAGE_TAG="$NEW_TAG" \
docker compose \
  -f "$COMPOSE" \
  up -d \
  --no-deps \
  --force-recreate \
  backend

echo
echo "=== WAIT BACKEND HEALTH ==="

for i in $(seq 1 30); do
  STATUS="$(
    docker inspect haymclub-backend \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}'
  )"

  echo "backend=$STATUS"

  if [ "$STATUS" = "healthy" ]; then
    break
  fi

  if [ "$i" = "30" ]; then
    echo "❌ BACKEND_HEALTH_TIMEOUT"
    "$BASE/rollback.sh"
    exit 1
  fi

  sleep 2
done

echo
echo "=== UPDATE FRONTEND ==="

IMAGE_TAG="$NEW_TAG" \
docker compose \
  -f "$COMPOSE" \
  up -d \
  --no-deps \
  --force-recreate \
  frontend

sleep 3

echo
echo "=== FINAL HEALTHCHECK ==="

if ! "$BASE/healthcheck.sh"; then
  echo "❌ DEPLOY_HEALTHCHECK_FAILED"
  "$BASE/rollback.sh"
  exit 1
fi

echo "$NEW_TAG" > "$CURRENT_TAG_FILE"

echo
echo "✅ DEPLOYMENT_SUCCESS"
echo "DEPLOYED_TAG=$NEW_TAG"
