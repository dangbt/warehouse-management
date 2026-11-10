#!/usr/bin/env bash
set -euo pipefail

# ===== Kho Việt — Update =====

# Tính ROOT_DIR từ vị trí script thật TRƯỚC khi re-exec
# (sau re-exec BASH_SOURCE[0] trỏ vào /tmp nên không dùng được)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- Re-exec từ bản copy tạm để tránh git checkout ghi đè script đang chạy ---
if [ -z "${KHO_VIET_UPDATE_REEXEC:-}" ]; then
  TMPSCRIPT="$(mktemp)"
  cp "$0" "$TMPSCRIPT"
  chmod +x "$TMPSCRIPT"
  export KHO_VIET_UPDATE_REEXEC=1
  export KHO_VIET_ROOT="$ROOT_DIR"
  exec "$TMPSCRIPT" "$@"
fi

# Sau re-exec: dùng ROOT_DIR đã export, xoá file tạm khi kết thúc
ROOT_DIR="${KHO_VIET_ROOT}"
trap 'rm -f "$0"' EXIT

cd "$ROOT_DIR"

TAG="${1:-}"

# ---------- Kiểm tra thay đổi local ----------

DIRTY="$(git status --porcelain)"
if [ -n "$DIRTY" ]; then
  echo "❌ Có thay đổi local chưa commit:" >&2
  echo "$DIRTY" >&2
  echo "" >&2
  echo "Hãy commit hoặc stash trước khi update." >&2
  exit 1
fi

# ---------- Backup trước ----------

echo "📦 Backup trước khi update..."
if ! bash "$ROOT_DIR/scripts/backup.sh"; then
  echo "❌ Backup thất bại. Huỷ update." >&2
  exit 1
fi

echo ""

# ---------- Fetch tags ----------

echo "🔄 Đang fetch tags mới..."
git fetch --tags

# Nếu không chỉ định tag → lấy tag mới nhất v*
if [ -z "$TAG" ]; then
  TAG="$(git tag -l 'v*' --sort=-version:refname | head -n 1)"
  if [ -z "$TAG" ]; then
    echo "❌ Không tìm thấy tag nào (v*). Hãy chỉ định tag: $0 <tag>" >&2
    exit 1
  fi
  echo "   Tag mới nhất: $TAG"
fi

echo "🔖 Chuyển sang tag: $TAG"
git checkout "$TAG"

echo ""
echo "🐳 Rebuild và khởi động containers..."
docker compose up -d --build

# ---------- Chờ health ----------

echo ""
echo "⏳ Chờ hệ thống sẵn sàng (tối đa 180s)..."

ENV_FILE="$ROOT_DIR/.env"
CURRENT_PORT=$(grep -E '^HTTP_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2)
CURRENT_PORT="${CURRENT_PORT:-8080}"

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
  echo "✅ Update thành công lên $TAG!"
else
  echo "⚠️  Hệ thống chưa sẵn sàng sau ${MAX_WAIT}s."
  echo ""
  echo "🔧 Hướng dẫn restore:"
  echo "   1. Xem logs: docker compose logs"
  echo "   2. Restore backup: ./scripts/restore.sh backups/<file-mới-nhất>.sql.gz"
  echo "   3. Quay về phiên bản cũ: git checkout <tag-cũ> && docker compose up -d --build"
  exit 1
fi
