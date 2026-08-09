#!/usr/bin/env bash
set -e

PROJECT_DIR="/workspaces/Haymclub"
BACKUP="$PROJECT_DIR/backups/haymclub-clean-state.dump"

echo "=== Haymclub Clean Reset ==="

if [ ! -f "$BACKUP" ]; then
  echo "❌ Backup not found:"
  echo "$BACKUP"
  exit 1
fi

echo "Stopping backend..."
lsof -ti:3000 | xargs -r kill

echo "Recreating database..."

docker compose exec -T postgres \
dropdb -U haymclub_admin --if-exists haymclub_academy

docker compose exec -T postgres \
createdb -U haymclub_admin haymclub_academy

echo "Restoring backup..."

docker compose exec -T postgres \
pg_restore \
-U haymclub_admin \
-d haymclub_academy \
--no-owner \
--no-privileges \
< "$BACKUP"

echo "Starting backend..."

cd "$PROJECT_DIR/backend"
npm run start:dev
