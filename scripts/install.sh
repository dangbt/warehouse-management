#!/usr/bin/env bash
set -euo pipefail

# ===== Kho Việt — Cài đặt 1 lệnh =====

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"

# ---------- helpers ----------

die() { echo "❌ $1" >&2; exit 1; }

rand_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

check_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker chưa được cài. Hãy cài Docker trước: https://docs.docker.com/get-docker/"
  docker compose version >/dev/null 2>&1 || die "Docker Compose (v2 plugin) chưa được cài."
}

usage() {
  cat <<EOF
Sử dụng: $0 [--profile=FNB|FASHION|RETAIL] [--port=PORT] [--build]

Tuỳ chọn:
  --profile=PROFILE   Loại hình kinh doanh (mặc định: FNB)
  --port=PORT         Cổng HTTP (mặc định: 8080)
  --build             Ép tự build image thay vì pull
  --help              Hiện trợ giúp
EOF
  exit 0
}

# ---------- parse arguments ----------

PROFILE=""
PORT=""
FORCE_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --profile=*) PROFILE="${arg#*=}" ;;
    --port=*)    PORT="${arg#*=}" ;;
    --build)     FORCE_BUILD=true ;;
    --help)      usage ;;
    *)           die "Tham số không hợp lệ: $arg. Chạy $0 --help để xem hướng dẫn." ;;
  esac
done

# ---------- main ----------

check_docker

echo "🏗️  Kho Việt — Cài đặt self-host"
echo ""

# Tạo .env nếu chưa có
if [ ! -f "$ENV_FILE" ]; then
  if [ ! -f "$ENV_EXAMPLE" ]; then
    die "Không tìm thấy $ENV_EXAMPLE"
  fi

  echo "📝 Tạo .env từ .env.example..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"

  # Sinh secret ngẫu nhiên
  JWT_SECRET="$(rand_hex)"
  POSTGRES_PASSWORD="$(rand_hex)"
  SETUP_TOKEN="$(rand_hex)"

  # Ghi vào .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$ENV_FILE"
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" "$ENV_FILE"
  sed -i "s|^SETUP_TOKEN=.*|SETUP_TOKEN=${SETUP_TOKEN}|" "$ENV_FILE"

  echo "   ✅ Đã sinh JWT_SECRET, POSTGRES_PASSWORD, SETUP_TOKEN ngẫu nhiên."
else
  echo "📝 .env đã tồn tại, giữ nguyên."
fi

# Áp dụng --profile nếu được chỉ định
if [ -n "$PROFILE" ]; then
  case "$PROFILE" in
    FNB|FASHION|RETAIL) ;;
    *) die "Profile không hợp lệ: $PROFILE. Chọn FNB, FASHION, hoặc RETAIL." ;;
  esac
  sed -i "s|^BUSINESS_PROFILE=.*|BUSINESS_PROFILE=${PROFILE}|" "$ENV_FILE"
  echo "   ✅ BUSINESS_PROFILE=${PROFILE}"
fi

# Áp dụng --port nếu được chỉ định
if [ -n "$PORT" ]; then
  sed -i "s|^HTTP_PORT=.*|HTTP_PORT=${PORT}|" "$ENV_FILE"
  echo "   ✅ HTTP_PORT=${PORT}"
fi

# Xác định KHO_VIET_VERSION từ git tag hiện tại
KHO_VIET_VERSION="latest"
if TAG="$(git describe --tags --exact-match 2>/dev/null)"; then
  KHO_VIET_VERSION="${TAG#v}"
fi

# Ghi KHO_VIET_VERSION vào .env
if grep -q '^KHO_VIET_VERSION=' "$ENV_FILE"; then
  sed -i "s|^KHO_VIET_VERSION=.*|KHO_VIET_VERSION=${KHO_VIET_VERSION}|" "$ENV_FILE"
else
  echo "KHO_VIET_VERSION=${KHO_VIET_VERSION}" >> "$ENV_FILE"
fi
echo "   ✅ KHO_VIET_VERSION=${KHO_VIET_VERSION}"

# Đọc port hiện tại từ .env
CURRENT_PORT=$(grep -E '^HTTP_PORT=' "$ENV_FILE" | cut -d= -f2)
CURRENT_PORT="${CURRENT_PORT:-8080}"

echo ""
echo "🐳 Khởi động containers..."
cd "$ROOT_DIR"

# Pull image dựng sẵn hoặc fallback build
if [ "$FORCE_BUILD" = true ]; then
  echo "   🔨 Chế độ --build: tự build image (5–15 phút)..."
  docker compose up -d --build
elif ! git describe --tags --exact-match >/dev/null 2>&1; then
  echo "   ℹ️  Mã nguồn không ở tag release, tự build từ mã nguồn hiện tại…"
  docker compose up -d --build
elif docker compose pull api web 2>/dev/null; then
  echo "   ✅ Đã tải image dựng sẵn."
  docker compose up -d --no-build
else
  echo "   ⚠️  Không tải được image dựng sẵn, chuyển sang tự build (lâu hơn)..."
  docker compose up -d --build
fi

# Chờ health check
echo ""
echo "⏳ Chờ hệ thống sẵn sàng (tối đa 180s)..."
SECONDS_WAITED=0
MAX_WAIT=180
HEALTHY=false

while [ "$SECONDS_WAITED" -lt "$MAX_WAIT" ]; do
  if docker compose ps --format json 2>/dev/null | grep -q '"Health":"healthy"'; then
    # Kiểm tra API health endpoint trực tiếp
    if curl -fsS "http://localhost:${CURRENT_PORT}/api/v1/health" >/dev/null 2>&1; then
      HEALTHY=true
      break
    fi
  fi
  sleep 5
  SECONDS_WAITED=$((SECONDS_WAITED + 5))
  printf "   %ds...\r" "$SECONDS_WAITED"
done

echo ""

if [ "$HEALTHY" = true ]; then
  # Đọc SETUP_TOKEN từ .env
  CURRENT_SETUP_TOKEN=$(grep -E '^SETUP_TOKEN=' "$ENV_FILE" | cut -d= -f2)

  echo "✅ Kho Việt đã chạy thành công!"
  echo ""
  echo "🌐 Truy cập: http://localhost:${CURRENT_PORT}"
  echo "🔑 SETUP_TOKEN: ${CURRENT_SETUP_TOKEN}"
  echo ""
  echo "📋 Bước tiếp theo:"
  echo "   1. Mở trình duyệt → http://localhost:${CURRENT_PORT}"
  echo "   2. Dùng SETUP_TOKEN ở trên để tạo tài khoản admin"
  echo "   3. (Tuỳ chọn) Dùng tên miền + HTTPS: xem AGENTS.md"
  echo ""
  echo "📦 Backup:  ./scripts/backup.sh"
  echo "🔄 Update:  ./scripts/update.sh"
else
  echo "⚠️  Hệ thống chưa sẵn sàng sau ${MAX_WAIT}s."
  echo "   Kiểm tra logs: docker compose logs"
  exit 1
fi
