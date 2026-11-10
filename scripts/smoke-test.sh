#!/usr/bin/env bash
set -euo pipefail

# ===== Kho Việt — Smoke test cho Docker self-host =====
# Sử dụng: ./scripts/smoke-test.sh <base_url>
# Ví dụ:   ./scripts/smoke-test.sh http://localhost:8080

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# ---------- helpers ----------

die() { echo "❌ FAIL: $1" >&2; exit 1; }
ok()  { echo "✅ $1"; }

# ---------- arguments ----------

BASE_URL="${1:-}"
if [ -z "$BASE_URL" ]; then
  echo "Sử dụng: $0 <base_url>" >&2
  echo "Ví dụ:   $0 http://localhost:8080" >&2
  exit 1
fi

# Bỏ trailing slash
BASE_URL="${BASE_URL%/}"

# Đọc SETUP_TOKEN từ .env (nếu có)
SETUP_TOKEN=""
if [ -f "$ENV_FILE" ]; then
  SETUP_TOKEN="$(grep -E '^SETUP_TOKEN=' "$ENV_FILE" | cut -d= -f2 || true)"
fi

echo "🔍 Smoke test — ${BASE_URL}"
echo ""

# ---------- 1. Health check ----------

HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/api/v1/health")"
if [ "$HTTP_CODE" != "200" ]; then
  die "/api/v1/health trả HTTP ${HTTP_CODE}, mong đợi 200"
fi
ok "GET /api/v1/health → 200"

# ---------- 2. Index HTML ----------

INDEX_BODY="$(curl -s "${BASE_URL}/")"
if ! echo "$INDEX_BODY" | grep -qi '<html\|<!doctype'; then
  die "GET / không trả HTML hợp lệ"
fi
ok "GET / → HTML hợp lệ"

# ---------- 3. Setup status → needsSetup: true ----------

SETUP_STATUS="$(curl -s "${BASE_URL}/api/v1/setup/status")"
if ! echo "$SETUP_STATUS" | grep -q '"needsSetup":true'; then
  die "GET /api/v1/setup/status không trả needsSetup:true — response: ${SETUP_STATUS}"
fi
ok "GET /api/v1/setup/status → needsSetup:true"

# ---------- 4. POST /setup không token → 403 ----------

NO_TOKEN_CODE="$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "${BASE_URL}/api/v1/setup" \
  -H 'Content-Type: application/json' \
  -d '{}')"
if [ "$NO_TOKEN_CODE" != "403" ]; then
  die "POST /api/v1/setup không token trả HTTP ${NO_TOKEN_CODE}, mong đợi 403"
fi
ok "POST /api/v1/setup (no token) → 403"

# ---------- 5. POST /setup với token → tạo admin ----------

if [ -z "$SETUP_TOKEN" ]; then
  die "Không tìm thấy SETUP_TOKEN trong .env — không thể chạy setup"
fi

ADMIN_EMAIL="smoke-admin-$(date +%s)@test.local"
ADMIN_PASS="SmokeTest123!"

SETUP_RESP="$(curl -s -w '\n%{http_code}' \
  -X POST "${BASE_URL}/api/v1/setup" \
  -H 'Content-Type: application/json' \
  -H "x-setup-token: ${SETUP_TOKEN}" \
  -d "{
    \"profile\": \"FNB\",
    \"admin\": {\"email\": \"${ADMIN_EMAIL}\", \"password\": \"${ADMIN_PASS}\", \"fullName\": \"Smoke Test\"},
    \"company\": {\"name\": \"Smoke Corp\", \"taxCode\": \"0123456789\", \"address\": \"123 Test\"},
    \"taxRegime\": \"VAT_DEDUCTION\"
  }")"

SETUP_CODE="$(echo "$SETUP_RESP" | tail -n1)"
SETUP_BODY="$(echo "$SETUP_RESP" | sed '$d')"

if [ "$SETUP_CODE" != "201" ] && [ "$SETUP_CODE" != "200" ]; then
  die "POST /api/v1/setup với token trả HTTP ${SETUP_CODE}, mong đợi 201/200 — body: ${SETUP_BODY}"
fi
ok "POST /api/v1/setup (with token) → ${SETUP_CODE} — admin tạo thành công"

# ---------- 6. POST /auth/login → thành công ----------

LOGIN_RESP="$(curl -s -w '\n%{http_code}' \
  -X POST "${BASE_URL}/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\": \"${ADMIN_EMAIL}\", \"password\": \"${ADMIN_PASS}\"}")"

LOGIN_CODE="$(echo "$LOGIN_RESP" | tail -n1)"
LOGIN_BODY="$(echo "$LOGIN_RESP" | sed '$d')"

if [ "$LOGIN_CODE" != "200" ] && [ "$LOGIN_CODE" != "201" ]; then
  die "POST /api/v1/auth/login trả HTTP ${LOGIN_CODE}, mong đợi 200/201 — body: ${LOGIN_BODY}"
fi
if ! echo "$LOGIN_BODY" | grep -q 'token\|access'; then
  die "POST /api/v1/auth/login không trả token — body: ${LOGIN_BODY}"
fi
ok "POST /api/v1/auth/login → ${LOGIN_CODE} — đăng nhập thành công"

# ---------- 7. POST /setup lần 2 → 409 ----------

SETUP2_CODE="$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "${BASE_URL}/api/v1/setup" \
  -H 'Content-Type: application/json' \
  -H "x-setup-token: ${SETUP_TOKEN}" \
  -d "{
    \"profile\": \"FNB\",
    \"admin\": {\"email\": \"dup@test.local\", \"password\": \"Test1234\", \"fullName\": \"Dup\"},
    \"company\": {\"name\": \"Dup Corp\", \"taxCode\": \"0123456789\", \"address\": \"456\"},
    \"taxRegime\": \"VAT_DEDUCTION\"
  }")"

if [ "$SETUP2_CODE" != "409" ]; then
  die "POST /api/v1/setup lần 2 trả HTTP ${SETUP2_CODE}, mong đợi 409"
fi
ok "POST /api/v1/setup (lần 2) → 409 — wizard đã khoá"

# ---------- Done ----------

echo ""
echo "🎉 Smoke test PASSED — tất cả kiểm tra đều OK"
