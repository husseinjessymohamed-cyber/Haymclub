#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="/workspaces/Haymclub"
BACKUP_FILE="$PROJECT_DIR/backups/haymclub-clean-state.dump"

cd "$PROJECT_DIR"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "❌ ملف Clean State غير موجود:"
  echo "$BACKUP_FILE"
  exit 1
fi

echo "⚠️ سيتم حذف جميع البيانات الحالية وإعادة الحالة النظيفة."
read -r -p "اكتب RESET للتأكيد: " CONFIRM

if [[ "$CONFIRM" != "RESET" ]]; then
  echo "تم إلغاء العملية."
  exit 0
fi

echo "إيقاف الاتصالات الحالية بقاعدة البيانات..."

docker compose exec -T postgres \
psql -U haymclub_admin -d postgres -v ON_ERROR_STOP=1 \
-c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'haymclub_academy'
  AND pid <> pg_backend_pid();
"

echo "إعادة إنشاء قاعدة البيانات..."

docker compose exec -T postgres \
psql -U haymclub_admin -d postgres -v ON_ERROR_STOP=1 \
-c "DROP DATABASE IF EXISTS haymclub_academy;"

docker compose exec -T postgres \
psql -U haymclub_admin -d postgres -v ON_ERROR_STOP=1 \
-c "CREATE DATABASE haymclub_academy OWNER haymclub_admin;"

echo "استعادة Clean State..."

docker compose exec -T postgres \
pg_restore \
  -U haymclub_admin \
  -d haymclub_academy \
  --no-owner \
  --no-privileges \
< "$BACKUP_FILE"

echo "التحقق من النتيجة..."

docker compose exec -T postgres \
psql -U haymclub_admin -d haymclub_academy \
-c "
SELECT
  (SELECT COUNT(*) FROM academies) AS academies,
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM academy_memberships) AS memberships;
"

docker compose exec -T postgres \
psql -U haymclub_admin -d haymclub_academy \
-c "
SELECT u.email, u.status, m.role, m.is_primary, m.is_active
FROM users u
JOIN academy_memberships m ON m.user_id = u.id;
"

echo "✅ تمت استعادة Clean State بنجاح."
echo "شغّل الـ Backend مرة أخرى باستخدام:"
echo "cd /workspaces/Haymclub/backend && npm run start:dev"
