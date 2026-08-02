#!/usr/bin/env bash
set -Eeuo pipefail

echo "إيقاف Haymclub..."

fuser -k 3000/tcp \
  2>/dev/null || true

fuser -k 5173/tcp \
  2>/dev/null || true

echo "✅ تم إيقاف Backend وFrontend"
