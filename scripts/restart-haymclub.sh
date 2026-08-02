#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/workspaces/Haymclub"

bash "$ROOT/scripts/stop-haymclub.sh"

sleep 2

bash "$ROOT/scripts/start-haymclub.sh"
