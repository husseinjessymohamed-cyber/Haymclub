#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

PRIVATE_FILE="smtp.private.env"

if [ ! -f "$PRIVATE_FILE" ]; then
  echo "❌ الملف غير موجود: $PRIVATE_FILE"
  exit 1
fi

SMTP_USER=""
SMTP_PASS=""
SMTP_TEST_TO=""

while IFS='=' read -r key value || [ -n "${key:-}" ]; do
  key="$(
    printf '%s' "$key" |
      tr -d '[:space:]'
  )"

  case "$key" in
    SMTP_USER)
      SMTP_USER="$value"
      ;;
    SMTP_PASS)
      SMTP_PASS="$value"
      ;;
    SMTP_TEST_TO)
      SMTP_TEST_TO="$value"
      ;;
  esac
done < "$PRIVATE_FILE"

SMTP_USER="$(
  printf '%s' "$SMTP_USER" |
    tr -d '[:space:]'
)"

SMTP_PASS="$(
  printf '%s' "$SMTP_PASS" |
    tr -d '[:space:]'
)"

SMTP_TEST_TO="$(
  printf '%s' "$SMTP_TEST_TO" |
    tr -d '[:space:]'
)"

EMAIL_PATTERN='^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'

if ! [[ "$SMTP_USER" =~ $EMAIL_PATTERN ]]; then
  echo "❌ SMTP_USER ليس بريدًا صحيحًا."
  echo "افتح smtp.private.env واكتب بريد Gmail الحقيقي."
  exit 1
fi

if [ -z "$SMTP_TEST_TO" ]; then
  SMTP_TEST_TO="$SMTP_USER"
fi

if ! [[ "$SMTP_TEST_TO" =~ $EMAIL_PATTERN ]]; then
  echo "❌ SMTP_TEST_TO ليس بريدًا صحيحًا."
  exit 1
fi

if [ "${#SMTP_PASS}" -ne 16 ]; then
  echo "❌ Gmail App Password يجب أن يتكوّن من 16 حرفًا."
  echo "استخدم App Password وليس كلمة مرور Gmail العادية."
  exit 1
fi

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_FROM="Haymclub <$SMTP_USER>"
PASSWORD_RESET_EXPIRES_MINUTES="30"

if [ -n "${CODESPACE_NAME:-}" ] && \
   [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  PASSWORD_RESET_BASE_URL="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
else
  PASSWORD_RESET_BASE_URL="https://haym.click"
fi

export \
  SMTP_HOST \
  SMTP_PORT \
  SMTP_SECURE \
  SMTP_USER \
  SMTP_PASS \
  SMTP_FROM \
  SMTP_TEST_TO \
  PASSWORD_RESET_BASE_URL \
  PASSWORD_RESET_EXPIRES_MINUTES

python3 <<'PY'
import json
import os
from pathlib import Path

path = Path(".env.local")

existing = (
    path.read_text(encoding="utf-8")
    if path.exists()
    else ""
)

smtp_keys = {
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "SMTP_TEST_TO",
    "PASSWORD_RESET_BASE_URL",
    "PASSWORD_RESET_EXPIRES_MINUTES",
}

lines = []

for line in existing.splitlines():
    stripped = line.strip()

    if stripped in {
        "# Haymclub SMTP",
        "# Haymclub real email",
    }:
        continue

    key = (
        stripped.split("=", 1)[0].strip()
        if "=" in stripped
        else ""
    )

    if key in smtp_keys:
        continue

    lines.append(line)

while lines and not lines[-1].strip():
    lines.pop()

if lines:
    lines.append("")

lines.append("# Haymclub SMTP")

ordered_keys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "SMTP_TEST_TO",
    "PASSWORD_RESET_BASE_URL",
    "PASSWORD_RESET_EXPIRES_MINUTES",
]

for key in ordered_keys:
    lines.append(
        f"{key}={json.dumps(os.environ[key])}"
    )

path.write_text(
    "\n".join(lines) + "\n",
    encoding="utf-8",
)

path.chmod(0o600)

print("✅ تم حفظ إعدادات SMTP في .env.local")
PY

echo
echo "======================================"
echo "اختبار Gmail SMTP"
echo "======================================"

npx ts-node \
  --transpile-only \
  scripts/test-smtp.ts

echo
echo "======================================"
echo "إعادة تشغيل Backend"
echo "======================================"

if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp 2>/dev/null || true
fi

nohup npm run start:dev \
  > /tmp/haymclub-backend.log \
  2>&1 &

echo $! > /tmp/haymclub-backend.pid

READY="no"

for attempt in $(seq 1 60); do
  STATUS="$(
    curl -sS \
      -o /dev/null \
      -w "%{http_code}" \
      http://127.0.0.1:3000/api \
      2>/dev/null || true
  )"

  if [ "$STATUS" = "200" ]; then
    READY="yes"
    break
  fi

  sleep 1
done

if [ "$READY" != "yes" ]; then
  echo "❌ Backend لم يبدأ"

  tail -150 \
    /tmp/haymclub-backend.log \
    || true

  exit 1
fi

unset SMTP_PASS

echo
echo "======================================"
echo "✅ تم ربط البريد الحقيقي بنجاح"
echo "======================================"
echo "افحص Inbox وSpam في بريد الاختبار."
