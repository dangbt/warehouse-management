# AGENTS.md — Hướng dẫn cho trợ lý AI

File này dành cho **trợ lý AI** (Claude, ChatGPT, Cursor, Copilot…) giúp người dùng cài đặt và vận hành Kho Việt.
Nếu bạn là developer muốn đóng góp code → xem [CLAUDE.md](CLAUDE.md) và [docs/](docs/).

---

## Cài đặt cho người dùng (self-host)

### Bước 1 — Hỏi người dùng (tối đa 3 câu)

Trước khi làm gì, hỏi người dùng:

1. **Ngành nghề?** → `FNB` (nhà hàng/F&B), `FASHION` (thời trang), hoặc `RETAIL` (bán lẻ).
2. **Chạy ở đâu?** → Máy này (localhost) hay VPS/server từ xa?
3. **Cổng và tên miền?** (chỉ hỏi nếu VPS) → Cổng HTTP (mặc định `8080`), tên miền nếu có.

Nếu người dùng không biết chọn ngành nghề → mặc định `FNB`.

### Bước 2 — Kiểm tra Docker

Chạy lệnh kiểm tra:

```bash
docker --version && docker compose version
```

**Kết quả mong đợi:**
```
Docker version 24.x+ ...
Docker Compose version v2.x+ ...
```

**Nếu chưa có Docker:** KHÔNG tự cài. Đưa người dùng link hướng dẫn chính thức theo OS:
- Linux: https://docs.docker.com/engine/install/
- macOS: https://docs.docker.com/desktop/install/mac-install/
- Windows: https://docs.docker.com/desktop/install/windows-install/ (cần WSL2)

Chờ người dùng xác nhận Docker đã cài xong rồi mới tiếp tục.

### Bước 3 — Clone repo (tag release mới nhất)

**Quan trọng: dùng tag release, KHÔNG dùng master.**

```bash
git clone https://github.com/dangbt/warehouse-management.git
cd warehouse-management
```

Tìm tag release mới nhất:

```bash
git tag -l 'v*' --sort=-version:refname | head -n 5
```

Checkout tag đó:

```bash
git checkout <tag-mới-nhất>
```

**Kết quả mong đợi:** `HEAD is now at ... <tag>`

**Nếu không có tag nào:** Báo người dùng repo chưa có release. Dừng lại, không dùng master để cài production.

### Bước 4 — Chạy cài đặt

```bash
./scripts/install.sh --profile=<NGÀNH> --port=<CỔNG>
```

Ví dụ:

```bash
./scripts/install.sh --profile=FNB --port=8080
```

Script `scripts/install.sh` tự động:
- Tạo `.env` từ `.env.example` (nếu chưa có)
- Sinh ngẫu nhiên `JWT_SECRET`, `POSTGRES_PASSWORD`, `SETUP_TOKEN`
- Đặt `BUSINESS_PROFILE` và `HTTP_PORT` theo tham số
- Chạy `docker compose up -d --build`
- Chờ health check (tối đa 180 giây)

**Kết quả mong đợi:**
```
✅ Kho Việt đã chạy thành công!
🌐 Truy cập: http://localhost:8080
🔑 SETUP_TOKEN: <mã-token>
```

**Nếu lỗi:** Xem mục [Xử lý sự cố](#xử-lý-sự-cố) bên dưới.

### Bước 5 — Kiểm chứng & hướng dẫn wizard

Kiểm tra health:

```bash
curl -s http://localhost:<CỔNG>/api/v1/health
```

**Kết quả mong đợi:** `{"status":"ok","timestamp":"..."}`

Kiểm tra trạng thái cài đặt:

```bash
curl -s http://localhost:<CỔNG>/api/v1/setup/status
```

**Kết quả mong đợi:** `{"needsSetup":true,"requiresToken":true}`

Đưa người dùng:
- **URL:** `http://localhost:<CỔNG>` (hoặc `http://<tên-miền>:<CỔNG>` nếu VPS)
- **SETUP_TOKEN:** lấy từ output bước 4, hoặc đọc từ `.env`: `grep SETUP_TOKEN .env`

Hướng dẫn người dùng mở trình duyệt, hoàn tất wizard:
- Nhập SETUP_TOKEN
- Chọn ngành nghề, tên doanh nghiệp, MST, địa chỉ, chế độ thuế, logo (tuỳ chọn)
- Tạo tài khoản admin (email + mật khẩu)

Sau khi wizard xong, `GET /api/v1/setup/status` sẽ trả `{"needsSetup":false,...}` và wizard tự khoá.

### Bước 6 — Đề xuất backup tự động

Giải thích cho người dùng: nên đặt lịch backup tự động để tránh mất dữ liệu.

```bash
# Backup thủ công
./scripts/backup.sh
```

File backup lưu tại thư mục `backups/` trong repo, tên dạng `kho-viet-YYYYMMDD-HHMMSS.sql.gz`.

Đề xuất crontab (backup lúc 2:00 sáng mỗi ngày):

```bash
crontab -e
# Thêm dòng:
0 2 * * * cd /đường/dẫn/đến/warehouse-management && ./scripts/backup.sh >> backups/cron.log 2>&1
```

Thay `/đường/dẫn/đến/warehouse-management` bằng đường dẫn thực tế trên máy người dùng.

---

## Xử lý sự cố

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `port is already allocated` | Cổng HTTP đang bị chiếm | Đổi cổng: sửa `HTTP_PORT` trong `.env`, chạy lại `docker compose up -d` |
| `Cannot connect to the Docker daemon` | Docker chưa chạy | Chạy `sudo systemctl start docker` (Linux) hoặc mở Docker Desktop |
| `Set POSTGRES_PASSWORD in .env` | Thiếu `.env` hoặc chưa có giá trị | Chạy lại `./scripts/install.sh` (tự tạo `.env`) |
| `Set JWT_SECRET in .env` | Thiếu `JWT_SECRET` | Chạy lại `./scripts/install.sh` (tự sinh secret) |
| API unhealthy / health không trả OK | Container lỗi hoặc DB chưa sẵn sàng | `docker compose logs api` để xem chi tiết lỗi |
| `needsSetup: false` nhưng chưa tạo admin | Đã có dữ liệu cũ trong DB | Kiểm tra dữ liệu hoặc restore backup |
| Hệ thống chưa sẵn sàng sau 180s | Build lâu hoặc máy yếu | Chờ thêm, kiểm tra `docker compose logs` |

---

## Không được làm

Khi cài đặt và hỗ trợ người dùng, trợ lý AI **KHÔNG ĐƯỢC**:

- ❌ Sửa code nghiệp vụ (file `.ts`, `.tsx`, `.prisma`…) — đây là bản production, không phải dev.
- ❌ Chạy `docker compose down -v` hoặc xoá volume — sẽ **mất toàn bộ dữ liệu**.
- ❌ Sửa `JWT_SECRET` trong `.env` sau khi hệ thống đã có dữ liệu — mọi phiên đăng nhập sẽ lỗi.
- ❌ Xoá hoặc ẩn dòng "Powered by Kho Việt — dangbt" trên giao diện — bắt buộc theo `NOTICE` (AGPL §7(b)).
- ❌ Xoá hoặc sửa file `NOTICE` — bắt buộc giữ nguyên theo license.
- ❌ Commit file `.env` vào git — chứa secret, đã có trong `.gitignore`.
- ❌ Chạy `npx prisma db seed` trên instance thật — đây là seed dữ liệu demo, chỉ dùng cho dev.

---

## Cập nhật

Khi có phiên bản mới:

```bash
./scripts/update.sh
```

Script `scripts/update.sh` tự động:
- Kiểm tra không có thay đổi local chưa commit
- Backup database trước khi update
- Fetch tags mới, checkout tag `v*` mới nhất
- Rebuild containers, chờ health check

Chỉ định phiên bản cụ thể:

```bash
./scripts/update.sh v1.2.0
```

### Restore khi update lỗi

Nếu update gặp sự cố:

```bash
# Xem logs
docker compose logs api

# Restore backup (file mới nhất trong backups/)
./scripts/restore.sh backups/<file-backup-mới-nhất>.sql.gz

# Quay về phiên bản cũ
git checkout <tag-cũ>
docker compose up -d --build
```

---

## Phát triển

Nếu bạn là developer hoặc AI đang giúp phát triển tính năng / sửa bug:

- Đọc [CLAUDE.md](CLAUDE.md) — quy tắc phát triển, cấu trúc monorepo, feature flags.
- Đọc [docs/](docs/) — tài liệu thiết kế, ERD, API spec.
- Đọc [CONTRIBUTING.md](CONTRIBUTING.md) — cách chạy dev, test, gửi PR.
