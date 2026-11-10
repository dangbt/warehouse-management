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

Kiểm tra health (chạy trên server):

```bash
curl -s http://localhost:<CỔNG>/api/v1/health
```

**Kết quả mong đợi:** `{"status":"ok","timestamp":"..."}`

Kiểm tra trạng thái cài đặt:

```bash
curl -s http://localhost:<CỔNG>/api/v1/setup/status
```

**Kết quả mong đợi:** `{"needsSetup":true,"requiresToken":true}`

**Nếu chạy trên localhost:** Đưa người dùng URL `http://localhost:<CỔNG>` và SETUP_TOKEN (lấy từ output bước 4, hoặc `grep SETUP_TOKEN .env`).

**Nếu chạy trên VPS:** ⚠️ KHÔNG đưa người dùng mở wizard qua HTTP công khai — SETUP_TOKEN và mật khẩu admin sẽ bị gửi dạng plaintext. Thiết lập HTTPS trước (xem [Tên miền & HTTPS (VPS)](#tên-miền--https-vps) bên dưới), rồi mới đưa URL HTTPS để người dùng hoàn tất wizard.

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

## Tên miền & HTTPS (VPS)

Trên VPS, **bắt buộc thiết lập HTTPS** trước khi cho người dùng mở wizard hoặc đăng nhập — SETUP_TOKEN và mật khẩu
gửi qua HTTP trần sẽ bị lộ.

Có 2 cách:

### Cách A — Caddy (reverse proxy, tự cấp Let's Encrypt)

**Yêu cầu:** DNS A record trỏ tên miền về IP của VPS, mở cổng 80 và 443 trên firewall.

1. Cài Caddy theo hướng dẫn chính thức: https://caddyserver.com/docs/install

2. Tạo file `/etc/caddy/Caddyfile`:

```
kho.example.com {
    reverse_proxy localhost:<HTTP_PORT>
}
```

Thay `kho.example.com` bằng tên miền thực và `<HTTP_PORT>` bằng cổng đã chọn (mặc định `8080`).

3. Khởi động Caddy:

```bash
sudo systemctl enable --now caddy
```

**Kết quả mong đợi:** Caddy tự xin chứng chỉ Let's Encrypt. Truy cập `https://kho.example.com` → thấy trang Kho Việt.

**Nếu lỗi:** `sudo journalctl -u caddy` để xem log. Nguyên nhân phổ biến: DNS chưa trỏ đúng, cổng 80/443 bị chặn.

### Cách B — Cloudflare Tunnel

Không cần mở cổng 80/443, không cần DNS A record thủ công (Cloudflare quản lý).

**Thử nhanh (tunnel tạm thời):**

```bash
cloudflared tunnel --url http://localhost:<HTTP_PORT>
```

**Kết quả mong đợi:** Terminal hiện URL dạng `https://xxx-yyy-zzz.trycloudflare.com`. Truy cập URL đó → thấy trang Kho Việt.

**Dùng lâu dài (tunnel có tên):**

1. Cài cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

2. Đăng nhập và tạo tunnel:

```bash
cloudflared tunnel login
cloudflared tunnel create kho-viet
cloudflared tunnel route dns kho-viet kho.example.com
```

3. Tạo file `~/.cloudflared/config.yml`:

```yaml
tunnel: kho-viet
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: kho.example.com
    service: http://localhost:<HTTP_PORT>
  - service: http_status:404
```

4. Chạy tunnel:

```bash
cloudflared tunnel run kho-viet
```

**Kết quả mong đợi:** Truy cập `https://kho.example.com` → thấy trang Kho Việt.

Để chạy nền (systemd): `sudo cloudflared service install && sudo systemctl enable --now cloudflared`.

---

Sau khi HTTPS hoạt động, quay lại Bước 5: đưa người dùng URL `https://<tên-miền>` và SETUP_TOKEN để hoàn tất wizard.

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
