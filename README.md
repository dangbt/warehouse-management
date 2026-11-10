# Kho Việt — Hệ thống quản lý kho hàng

Phần mềm quản lý xuất nhập kho **mã nguồn mở** cho doanh nghiệp Việt Nam, hỗ trợ nhiều ngành nghề.

## Kho Việt là gì?

Kho Việt giúp doanh nghiệp nhỏ và vừa quản lý toàn bộ quy trình kho: nhập kho, xuất kho, kiểm kê,
mua hàng, công nợ nhà cung cấp, lô hàng & hạn sử dụng — trên giao diện tiếng Việt thân thiện.
Mỗi khách hàng sở hữu 1 instance và database riêng biệt (self-host).

## Tính năng chính theo ngành

| Tính năng | F&B (nhà hàng) | Thời trang | Bán lẻ |
|-----------|:-:|:-:|:-:|
| Nhập kho + phê duyệt | ✅ | ✅ | ✅ |
| Xuất kho + kiểm kê | ✅ | ✅ | ✅ |
| Lô hàng & hạn sử dụng | ✅ | tuỳ chọn | ✅ |
| Mua hàng (PR → PO → nhập) | ✅ | ✅ | ✅ |
| Trả hàng NCC + công nợ | ✅ | ✅ | ✅ |
| Hoá đơn điện tử (e-invoice XML) | ✅ | ✅ | ✅ |
| Công thức & Thực đơn | ✅ | — | — |
| Chế biến (NL thô → BTP) | ✅ | — | — |
| Đồng bộ KiotViet (POS) | ✅ | ✅ | ✅ |
| Biến thể sản phẩm (Size, Màu) | — | ✅ | tuỳ chọn |
| Khách trả hàng | — | ✅ | ✅ |
| Bắt buộc mã vạch | — | ✅ | ✅ |
| Phân quyền RBAC + Audit log | ✅ | ✅ | ✅ |

Bật/tắt từng tính năng ở menu Hệ thống → Ngành nghề.

## Yêu cầu hệ thống

- Máy chạy **Docker** (Docker Engine + Docker Compose v2 plugin)
- **2 GB RAM** trở lên
- **5 GB** dung lượng đĩa trống
- Hệ điều hành: Linux, macOS, hoặc Windows (với WSL2/Docker Desktop)

## Nhờ trợ lý AI cài giúp

Nếu bạn chưa quen command line, hãy dán câu sau vào bất kỳ trợ lý AI nào
(Claude, ChatGPT, Cursor, Copilot…):

```
Hãy cài Kho Việt từ https://github.com/dangbt/warehouse-management theo AGENTS.md
```

Trợ lý AI sẽ đọc file `AGENTS.md` trong repo và hướng dẫn bạn từng bước.

## Cài đặt thủ công (3 bước)

```bash
# 1. Clone repo (dùng tag release mới nhất)
git clone https://github.com/dangbt/warehouse-management.git
cd warehouse-management
git checkout "$(git tag -l 'v*' --sort=-version:refname | head -n 1)"

# 2. Chạy script cài đặt
./scripts/install.sh --profile=FNB --port=8080

# 3. Mở trình duyệt → http://localhost:8080 → hoàn tất wizard cài đặt
```

Wizard hỏi: ngành nghề, tên doanh nghiệp, MST, địa chỉ, chế độ thuế, logo (tuỳ chọn), tài khoản admin.

## Backup & Cập nhật

```bash
# Backup database
./scripts/backup.sh
# File lưu tại: backups/kho-viet-YYYYMMDD-HHMMSS.sql.gz

# Cập nhật lên phiên bản mới
./scripts/update.sh
# (Tự động backup trước khi update)

# Restore từ backup khi cần
./scripts/restore.sh backups/kho-viet-YYYYMMDD-HHMMSS.sql.gz
```

Nên đặt lịch backup tự động bằng crontab:

```bash
# Backup lúc 2:00 sáng mỗi ngày
0 2 * * * /đường/dẫn/đến/warehouse-management/scripts/backup.sh
```

## License

**AGPL-3.0-or-later** — xem file [LICENSE](LICENSE).

Theo điều khoản bổ sung AGPL §7(b) trong file [NOTICE](NOTICE):

- Giữ nguyên file `NOTICE` trong mã nguồn.
- Giữ nguyên dòng **"Powered by Kho Việt — dangbt"** trên giao diện người dùng.

Bạn có thể thêm thương hiệu riêng bên cạnh, nhưng **không được xoá hoặc ẩn** phần ghi công gốc.

## Tác giả

**dangbt** — [github.com/dangbt](https://github.com/dangbt)

---

## English Summary

**Kho Việt** is an open-source warehouse management system for Vietnamese SMBs.
It supports multiple business profiles (F&B, Fashion, Retail) with features like
purchase orders, stock-in/out, stocktake, batch tracking, supplier payments,
e-invoice parsing, recipe management (F&B), and product variants (Fashion).

Self-host with Docker — see [AGENTS.md](AGENTS.md) for AI-assisted installation
or follow the 3-step manual install above. Licensed under AGPL-3.0-or-later.
