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

# Đảm bảo api luôn được start lại dù có lỗi
restart_api() {
  echo "🔄 Khởi động lại api..."
  docker compose start api || true

  # Đọc port từ .env
  ENV_FILE="$ROOT_DIR/.env"
  CURRENT_PORT=$(grep -E '^HTTP_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2)
  CURRENT_PORT="${CURRENT_PORT:-8080}"

  echo "⏳ Chờ api sẵn sàng (tối đa 180s)..."
  SECONDS_WAITED=0
  MAX_WAIT=180
  HEALTHY=false

  while [ "$SECONDS_WAITED" -lt "$MAX_WAIT" ]; do
    if curl -fsS "http://localhost:${CURRENT_PORT}/api/v1/health" >/dev/null 2>&1; then
      HEALTHY=true
      break
    fi
    sleep 5
    SECONDS_WAITED=$((SECONDS_WAITED + 5))
    printf "   %ds...\r" "$SECONDS_WAITED"
  done

  echo ""

  if [ "$HEALTHY" = true ]; then
    echo "✅ API sẵn sàng."
  else
    echo "⚠️  API chưa sẵn sàng sau ${MAX_WAIT}s. Kiểm tra: docker compose logs api" >&2
  fi
}

trap restart_api EXIT

echo "🛑 Dừng api để giải phóng kết nối database..."
docker compose stop api

echo "🔄 Đang restore database..."

# Drop và tạo lại database
docker compose exec -T db psql -U khoviet -d postgres -c "DROP DATABASE IF EXISTS khoviet;"
docker compose exec -T db psql -U khoviet -d postgres -c "CREATE DATABASE khoviet OWNER khoviet;"

# Restore từ backup
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U khoviet -d khoviet

echo "✅ Restore thành công từ: $BACKUP_FILE"
echo ""
echo "🔄 Api sẽ tự động khởi động lại (migrate deploy chạy lúc start)..."
