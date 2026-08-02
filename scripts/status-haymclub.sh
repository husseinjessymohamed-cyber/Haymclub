#!/usr/bin/env bash
set -Eeuo pipefail

CODESPACE="${CODESPACE_NAME:-super-duper-space-memory-qvqgw45pv5p5fx76}"
FRONTEND_URL="https://${CODESPACE}-5173.app.github.dev"

BACKEND="$(
  curl -s \
    -o /dev/null \
    -w '%{http_code}' \
    http://127.0.0.1:3000/api/portal/me \
    2>/dev/null || true
)"

FRONTEND="$(
  curl -s \
    -o /dev/null \
    -w '%{http_code}' \
    http://127.0.0.1:5173 \
    2>/dev/null || true
)"

PROXY="$(
  curl -s \
    -o /dev/null \
    -w '%{http_code}' \
    http://127.0.0.1:5173/api/portal/me \
    2>/dev/null || true
)"

echo
echo "Haymclub Status"
echo "================================"
echo "Backend 3000: $BACKEND"
echo "Frontend 5173: $FRONTEND"
echo "API Proxy: $PROXY"
echo
echo "منصة الأكاديمية:"
echo "$FRONTEND_URL/"
echo
echo "السوبر أدمن:"
echo "$FRONTEND_URL/#super-admin"
echo
echo "المتدرب وولي الأمر:"
echo "$FRONTEND_URL/#client-portal"
echo
echo "Processes:"
lsof -iTCP:3000 -sTCP:LISTEN 2>/dev/null || true
lsof -iTCP:5173 -sTCP:LISTEN 2>/dev/null || true
