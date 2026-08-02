#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -n "${CODESPACE_NAME:-}" ] && \
   [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  DEFAULT_RESET_URL="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
else
  DEFAULT_RESET_URL="https://haym.click"
fi

echo "======================================"
echo "إعداد بريد Haymclub الحقيقي"
echo "======================================"
echo
echo "اكتب القيمة المطلوبة فقط."
echo "لا تلصق جمل الشرح داخل الأسئلة."
echo

while true; do
  read -r -p "SMTP Host [smtp.gmail.com]: " SMTP_HOST_INPUT

  SMTP_HOST="${SMTP_HOST_INPUT:-smtp.gmail.com}"

  if [[ "$SMTP_HOST" =~ ^[A-Za-z0-9.-]+$ ]]; then
    break
  fi

  echo "❌ عنوان SMTP غير صالح."
done

while true; do
  read -r -p "SMTP Port [465]: " SMTP_PORT_INPUT

  SMTP_PORT="${SMTP_PORT_INPUT:-465}"

  if [[ "$SMTP_PORT" =~ ^[0-9]+$ ]] && \
     [ "$SMTP_PORT" -ge 1 ] && \
     [ "$SMTP_PORT" -le 65535 ]; then
    break
  fi

  echo "❌ رقم المنفذ غير صالح."
done

if [ "$SMTP_PORT" = "465" ]; then
  DEFAULT_SECURE="true"
else
  DEFAULT_SECURE="false"
fi

while true; do
  read -r -p \
    "SMTP Secure true/false [$DEFAULT_SECURE]: " \
    SMTP_SECURE_INPUT

  SMTP_SECURE="${SMTP_SECURE_INPUT:-$DEFAULT_SECURE}"

  SMTP_SECURE="$(
    printf '%s' "$SMTP_SECURE" |
      tr '[:upper:]' '[:lower:]'
  )"

  if [ "$SMTP_SECURE" = "true" ] || \
     [ "$SMTP_SECURE" = "false" ]; then
    break
  fi

  echo "❌ اكتب true أو false فقط."
done

while true; do
  read -r -p "البريد المرسل كاملًا: " SMTP_USER_INPUT

  SMTP_USER="$(
    printf '%s' "$SMTP_USER_INPUT" |
      tr -d '[:space:]'
  )"

  if [[ "$SMTP_USER" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
    break
  fi

  echo "❌ اكتب بريدًا صحيحًا مثل name@gmail.com"
done

while true; do
  read -r -s -p \
    "كلمة مرور SMTP أو Gmail App Password: " \
    SMTP_PASS_INPUT

  echo

  SMTP_PASS="$(
    printf '%s' "$SMTP_PASS_INPUT" |
      tr -d '[:space:]'
  )"

  if [ -z "$SMTP_PASS" ]; then
    echo "❌ كلمة المرور فارغة."
    continue
  fi

  if [ "$SMTP_HOST" = "smtp.gmail.com" ] && \
     [ "${#SMTP_PASS}" -ne 16 ]; then
    echo "❌ Gmail يحتاج App Password مكوّنًا من 16 حرفًا."
    echo "لا تستخدم كلمة مرور حساب Gmail العادية."
    continue
  fi

  if [ "${#SMTP_PASS}" -lt 8 ]; then
    echo "❌ كلمة مرور SMTP قصيرة جدًا."
    continue
  fi

  break
done

read -r -p "اسم المرسل [Haymclub]: " SMTP_DISPLAY_NAME_INPUT

SMTP_DISPLAY_NAME="${SMTP_DISPLAY_NAME_INPUT:-Haymclub}"
SMTP_FROM="$SMTP_DISPLAY_NAME <$SMTP_USER>"

while true; do
  read -r -p \
    "بريد استقبال رسالة الاختبار [$SMTP_USER]: " \
    SMTP_TEST_TO_INPUT

  SMTP_TEST_TO="${SMTP_TEST_TO_INPUT:-$SMTP_USER}"

  SMTP_TEST_TO="$(
    printf '%s' "$SMTP_TEST_TO" |
      tr -d '[:space:]'
  )"

  if [[ "$SMTP_TEST_TO" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
    break
  fi

  echo "❌ بريد استقبال الاختبار غير صالح."
done

read -r -p \
  "رابط تغيير كلمة المرور [$DEFAULT_RESET_URL]: " \
  PASSWORD_RESET_BASE_URL_INPUT

PASSWORD_RESET_BASE_URL="${
  PASSWORD_RESET_BASE_URL_INPUT:-$DEFAULT_RESET_URL
}"

PASSWORD_RESET_BASE_URL="${PASSWORD_RESET_BASE_URL%/}"

while true; do
  read -r -p \
    "صلاحية رابط الاستعادة بالدقائق [30]: " \
    PASSWORD_RESET_EXPIRES_INPUT

  PASSWORD_RESET_EXPIRES_MINUTES="${
    PASSWORD_RESET_EXPIRES_INPUT:-30
  }"

  if [[ "$PASSWORD_RESET_EXPIRES_MINUTES" =~ ^[0-9]+$ ]] && \
     [ "$PASSWORD_RESET_EXPIRES_MINUTES" -ge 5 ] && \
     [ "$PASSWORD_RESET_EXPIRES_MINUTES" -le 1440 ]; then
    break
  fi

  echo "❌ اختر رقمًا بين 5 و1440."
done

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

echo
echo "======================================"
echo "حفظ إعدادات SMTP"
echo "======================================"

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

keys = {
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

output_lines: list[str] = []

for line in existing.splitlines():
    stripped = line.strip()

    if stripped in {
        "# Haymclub real email",
        "# Haymclub SMTP",
    }:
        continue

    variable_name = (
        stripped.split("=", 1)[0].strip()
        if "=" in stripped
        else ""
    )

    if variable_name in keys:
        continue

    output_lines.append(line)

while output_lines and not output_lines[-1].strip():
    output_lines.pop()

if output_lines:
    output_lines.append("")

output_lines.append("# Haymclub SMTP")

for key in [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "SMTP_TEST_TO",
    "PASSWORD_RESET_BASE_URL",
    "PASSWORD_RESET_EXPIRES_MINUTES",
]:
    output_lines.append(
        f"{key}={json.dumps(os.environ[key])}"
    )

path.write_text(
    "\n".join(output_lines) + "\n",
    encoding="utf-8",
)

path.chmod(0o600)

print("✅ تم حفظ إعدادات SMTP بأمان")
PY

echo
echo "======================================"
echo "اختبار الاتصال وإرسال الرسالة"
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

BACKEND_READY="no"

for attempt in $(seq 1 60); do
  STATUS="$(
    curl -sS \
      -o /dev/null \
      -w "%{http_code}" \
      http://127.0.0.1:3000/api \
      2>/dev/null || true
  )"

  if [ "$STATUS" = "200" ]; then
    BACKEND_READY="yes"
    break
  fi

  sleep 1
done

if [ "$BACKEND_READY" != "yes" ]; then
  echo "❌ Backend لم يبدأ"
  tail -200 /tmp/haymclub-backend.log || true
  exit 1
fi

unset SMTP_PASS SMTP_PASS_INPUT

echo
echo "======================================"
echo "✅ اكتمل ربط البريد الحقيقي"
echo "======================================"
echo "افحص البريد الوارد ومجلد Spam."
