#!/usr/bin/env bash
set -euo pipefail

# ===== Kho Việt — Backup database =====

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"

cd "$ROOT_DIR"

# Kiểm tra container db đang chạy
if ! docker compose ps --format '{{.Service}}' 2>/dev/null | grep -q '^db$'; then
  echo "❌ Container db chưa chạy. Hãy chạy: docker compose up -d" >&2
  exit 1
fi

# Tạo thư mục backups
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILENAME="kho-viet-${TIMESTAMP}.sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

echo "📦 Đang backup database..."
docker compose exec -T db pg_dump -U khoviet khoviet | gzip > "$FILEPATH"

echo "✅ Backup thành công: $FILEPATH"
ls -lh "$FILEPATH"
