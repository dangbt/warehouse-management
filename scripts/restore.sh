#!/usr/bin/env bash
set -euo pipefail

# ===== Kho Việt — Restore database =====

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ $# -lt 1 ]; then
  echo "Sử dụng: $0 <backup-file.sql.gz>" >&2
  echo "Ví dụ:   $0 backups/kho-viet-20260101-120000.sql.gz" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Không tìm thấy file: $BACKUP_FILE" >&2
  exit 1
fi

cd "$ROOT_DIR"

# Kiểm tra container db đang chạy
if ! docker compose ps --format '{{.Service}}' 2>/dev/null | grep -q '^db$'; then
  echo "❌ Container db chưa chạy. Hãy chạy: docker compose up -d" >&2
  exit 1
fi

echo "⚠️  CẢNH BÁO: Thao tác này sẽ XOÁ TOÀN BỘ dữ liệu hiện tại và thay bằng backup:"
echo "   $BACKUP_FILE"
echo ""
read -r -p "Bạn có chắc chắn muốn tiếp tục? (gõ 'yes' để xác nhận): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Đã huỷ."
  exit 1
fi

echo "🔄 Đang restore database..."

# Drop và tạo lại database
docker compose exec -T db psql -U khoviet -d postgres -c "DROP DATABASE IF EXISTS khoviet;"
docker compose exec -T db psql -U khoviet -d postgres -c "CREATE DATABASE khoviet OWNER khoviet;"

# Restore từ backup
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U khoviet -d khoviet

echo "✅ Restore thành công từ: $BACKUP_FILE"
echo ""
echo "📋 Khởi động lại API để chạy migration (nếu cần):"
echo "   docker compose restart api"
