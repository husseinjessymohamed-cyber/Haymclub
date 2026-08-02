#!/usr/bin/env bash
set -Eeuo pipefail

CODESPACE="${CODESPACE_NAME:-}"

if [[ -z "$CODESPACE" ]]; then
  echo "❌ متغير CODESPACE_NAME غير موجود"
  exit 1
fi

FRONTEND_URL="https://${CODESPACE}-5173.app.github.dev"

echo
echo "ضبط Codespaces Ports:"
echo "Codespace: $CODESPACE"

echo
echo "أ) انتظار Frontend على 5173"

LOCAL_READY=0

for attempt in $(seq 1 90); do
  STATUS="$(
    curl -s \
      -o /dev/null \
      -w '%{http_code}' \
      http://127.0.0.1:5173 \
      2>/dev/null || true
  )"

  if [[ "$STATUS" == "200" ]]; then
    LOCAL_READY=1
    break
  fi

  sleep 1
done

if [[ "$LOCAL_READY" -ne 1 ]]; then
  echo "❌ Frontend لا يعمل محليًا على 5173"
  exit 1
fi

echo "✅ Frontend المحلي يعمل"

echo
echo "ب) التأكد من GitHub CLI"

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ GitHub CLI غير مثبت"
  exit 1
fi

if [[ -z "${GH_TOKEN:-}" &&
      -n "${GITHUB_TOKEN:-}" ]]; then
  export GH_TOKEN="$GITHUB_TOKEN"
fi

if ! gh auth status >/tmp/haymclub-gh-auth.log 2>&1; then
  echo "❌ GitHub CLI غير مسجل الدخول"
  cat /tmp/haymclub-gh-auth.log
  echo
  echo "نفّذ:"
  echo "gh auth login"
  exit 1
fi

echo "✅ GitHub CLI مسجل الدخول"

echo
echo "ج) جعل 5173 Public و3000 Private"

VISIBILITY_OK=0

for attempt in $(seq 1 30); do
  if gh codespace ports visibility \
    5173:public \
    3000:private \
    -c "$CODESPACE"
  then
    VISIBILITY_OK=1
    break
  fi

  echo "محاولة ${attempt}/30..."
  sleep 2
done

if [[ "$VISIBILITY_OK" -ne 1 ]]; then
  echo
  echo "❌ GitHub رفض تغيير Visibility"
  echo "قد تكون سياسة المؤسسة تمنع Public Ports."
  exit 1
fi

echo
echo "د) عرض حالة المنافذ"

gh codespace ports \
  -c "$CODESPACE" \
  || true

echo
echo "هـ) اختبار الرابط العام وعدم التحويل إلى pf-signin"

PUBLIC_READY=0

for attempt in $(seq 1 30); do
  HEADERS="/tmp/haymclub-public-5173-${attempt}.headers"

  PUBLIC_STATUS="$(
    curl -sS \
      --max-time 15 \
      -D "$HEADERS" \
      -o /dev/null \
      -w '%{http_code}' \
      "$FRONTEND_URL/" \
      2>/dev/null || true
  )"

  REDIRECT="$(
    grep -i '^location:' "$HEADERS" \
      2>/dev/null \
      | tr -d '\r' \
      || true
  )"

  echo "Public 5173 => HTTP ${PUBLIC_STATUS}"

  if echo "$REDIRECT" |
      grep -qi 'pf-signin'
  then
    echo "ما زال Private — إعادة المحاولة..."

    gh codespace ports visibility \
      5173:public \
      -c "$CODESPACE" \
      >/dev/null 2>&1 || true

    sleep 2
    continue
  fi

  if [[ "$PUBLIC_STATUS" == "200" ]]; then
    PUBLIC_READY=1
    break
  fi

  sleep 2
done

if [[ "$PUBLIC_READY" -ne 1 ]]; then
  echo
  echo "❌ الرابط العام ما زال يحول إلى GitHub Sign-in"
  exit 1
fi

echo
echo "✅ Port 5173 أصبح Public"
echo "✅ Port 3000 بقي Private"
echo "✅ لا يوجد تحويل إلى pf-signin"
echo
echo "الرابط:"
echo "$FRONTEND_URL"
