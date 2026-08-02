#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

if \
  [ -n "${CODESPACE_NAME:-}" ] &&
  [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]
then
  DEFAULT_RESET_URL="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
else
  DEFAULT_RESET_URL="https://haym.click"
fi

echo "======================================"
echo "إعداد بريد Haymclub الحقيقي"
echo "======================================"
echo
echo "أدخل بيانات SMTP داخل التيرمنال فقط."
echo "لن تظهر كلمة مرور البريد أثناء كتابتها."
echo

read -r -p \
  "SMTP Host [smtp.gmail.com]: " \
  SMTP_HOST

SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"

read -r -p \
  "SMTP Port [465]: " \
  SMTP_PORT

SMTP_PORT="${SMTP_PORT:-465}"

read -r -p \
  "SMTP Secure true/false [true]: " \
  SMTP_SECURE

SMTP_SECURE="${SMTP_SECURE:-true}"

read -r -p \
  "البريد المرسل: " \
  SMTP_USER

if [ -z "$SMTP_USER" ]; then
  echo "❌ البريد مطلوب"
  exit 1
fi

read -r -s -p \
  "كلمة مرور SMTP: " \
  SMTP_PASS

echo

if [ -z "$SMTP_PASS" ]; then
  echo "❌ كلمة مرور SMTP مطلوبة"
  exit 1
fi

read -r -p \
  "اسم المرسل [Haymclub <$SMTP_USER>]: " \
  SMTP_FROM

SMTP_FROM="${SMTP_FROM:-Haymclub <$SMTP_USER>}"

read -r -p \
  "البريد الذي يستقبل رسالة الاختبار [$SMTP_USER]: " \
  SMTP_TEST_TO

SMTP_TEST_TO="${SMTP_TEST_TO:-$SMTP_USER}"

read -r -p \
  "رابط صفحة تغيير كلمة المرور [$DEFAULT_RESET_URL]: " \
  PASSWORD_RESET_BASE_URL

PASSWORD_RESET_BASE_URL="${PASSWORD_RESET_BASE_URL:-$DEFAULT_RESET_URL}"

read -r -p \
  "صلاحية الرابط بالدقائق [30]: " \
  PASSWORD_RESET_EXPIRES_MINUTES

PASSWORD_RESET_EXPIRES_MINUTES="${PASSWORD_RESET_EXPIRES_MINUTES:-30}"

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

keys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "PASSWORD_RESET_BASE_URL",
    "PASSWORD_RESET_EXPIRES_MINUTES",
]

filtered_lines = []

for line in existing.splitlines():
    stripped = line.strip()

    if any(
        stripped.startswith(f"{key}=")
        for key in keys
    ):
        continue

    filtered_lines.append(line)

while (
    filtered_lines and
    not filtered_lines[-1].strip()
):
    filtered_lines.pop()

if filtered_lines:
    filtered_lines.append("")

filtered_lines.append(
    "# Haymclub real email"
)

for key in keys:
    filtered_lines.append(
        f"{key}={json.dumps(os.environ[key])}"
    )

path.write_text(
    "\n".join(filtered_lines) + "\n",
    encoding="utf-8",
)

print("✅ تم حفظ إعدادات SMTP في .env.local")
PY

echo
echo "======================================"
echo "اختبار خادم البريد"
echo "======================================"

npx ts-node \
  --transpile-only \
  scripts/test-smtp.ts

echo
echo "======================================"
echo "إعادة تشغيل Backend"
echo "======================================"

if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp \
    2>/dev/null || true
fi

nohup npm run start:dev \
  > /tmp/haymclub-backend.log \
  2>&1 &

echo $! \
  > /tmp/haymclub-backend.pid

for attempt in $(seq 1 60); do
  STATUS="$(
    curl -sS \
      -o /dev/null \
      -w "%{http_code}" \
      http://127.0.0.1:3000/api \
      2>/dev/null || true
  )"

  if [ "$STATUS" = "200" ]; then
    echo "✅ Backend شغال"
    break
  fi

  sleep 1
done

unset SMTP_PASS

echo
echo "======================================"
echo "✅ اكتمل إعداد البريد الحقيقي"
echo "======================================"
