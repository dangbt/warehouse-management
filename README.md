# Kho Việt — Phần mềm quản lý kho mã nguồn mở, miễn phí cho nhà hàng, thời trang, bán lẻ

[![License: AGPL-3.0](https://img.shields.io/github/license/dangbt/warehouse-management)](LICENSE)
[![Release](https://img.shields.io/github/v/release/dangbt/warehouse-management)](https://github.com/dangbt/warehouse-management/releases)
[![Self-host Docker](https://img.shields.io/github/actions/workflow/status/dangbt/warehouse-management/selfhost.yml?label=Self-host%20Docker)](https://github.com/dangbt/warehouse-management/actions/workflows/selfhost.yml)
![Self-host: Docker](https://img.shields.io/badge/Self--host-Docker-blue)

**Kho Việt** là phần mềm quản lý kho miễn phí, mã nguồn mở, tự cài đặt (self-host) trên máy chủ riêng của bạn.
Được thiết kế cho doanh nghiệp nhỏ và vừa tại Việt Nam — từ nhà hàng/F&B, shop thời trang đến cửa hàng bán lẻ —
với giao diện tiếng Việt, hỗ trợ thuế Việt Nam, và tích hợp đồng bộ đơn hàng KiotViet.

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

## Câu hỏi thường gặp (FAQ)

### Kho Việt có miễn phí không?

Có. Kho Việt phát hành theo giấy phép AGPL-3.0 — bạn được tải, cài đặt và sử dụng miễn phí. Chi phí duy nhất là tiền máy chủ nếu bạn chạy trên VPS; nếu cài trên máy tính cá nhân thì hoàn toàn không mất phí.

### Phần mềm quản lý kho nhà hàng miễn phí nào dùng được?

Kho Việt hỗ trợ đầy đủ nghiệp vụ kho cho nhà hàng/F&B: quản lý công thức & định lượng nguyên liệu, chế biến bán thành phẩm (BTP) từ nguyên liệu thô, theo dõi lô hàng & hạn sử dụng, và tự động trừ kho nguyên liệu theo đơn bán hàng KiotViet. Tất cả tính năng này được bật sẵn khi chọn hồ sơ ngành F&B.

### Có dùng cho shop thời trang / cửa hàng bán lẻ được không?

Có. Hồ sơ ngành Thời trang (FASHION) bật sẵn biến thể sản phẩm theo size/màu, bắt buộc mã vạch, và xử lý khách trả hàng. Hồ sơ Bán lẻ (RETAIL) bật sẵn mã vạch bắt buộc, khách trả hàng, và theo dõi hạn sử dụng; biến thể size/màu là tuỳ chọn (bật ở Hệ thống → Ngành nghề).

### Có thay thế được KiotViet / Sapo / MISA không?

Kho Việt tập trung vào quản lý kho, không phải phần mềm POS bán hàng. Kho Việt tích hợp đồng bộ đơn hàng từ KiotViet để tự động trừ kho và tính doanh thu. Về thuế, Kho Việt có module tính thuế VAT (khấu trừ và hộ kinh doanh), sổ doanh thu, sổ nguyên vật liệu, và khoá kỳ thuế — nhưng không phải phần mềm kế toán đầy đủ như MISA. Phù hợp nhất khi dùng song song với POS hiện tại của bạn.

### Không biết kỹ thuật có tự cài được không?

Có. Bạn chỉ cần máy tính có Docker. Dán câu "Hãy cài Kho Việt từ https://github.com/dangbt/warehouse-management theo AGENTS.md" vào bất kỳ trợ lý AI nào (Claude, ChatGPT, Cursor, Copilot…) — trợ lý sẽ đọc file AGENTS.md trong repo và hướng dẫn bạn từng bước, từ cài Docker đến hoàn tất wizard.

### Dữ liệu lưu ở đâu, có an toàn không?

Toàn bộ dữ liệu lưu trên máy chủ hoặc VPS của bạn, trong database PostgreSQL riêng biệt — Kho Việt không tự gửi dữ liệu đi đâu, trừ khi bạn tự bật tích hợp KiotViet (đồng bộ đơn hàng) hoặc Telegram hỗ trợ. Kho Việt có sẵn script `backup.sh` để sao lưu database, và bạn nên đặt lịch backup tự động bằng crontab để tránh mất dữ liệu.

### Cài trên máy tính cá nhân hay cần server?

Cả hai đều được. Bạn có thể cài trên máy tính cá nhân (localhost) để dùng nội bộ, hoặc trên VPS để truy cập từ xa. Nếu chạy trên VPS, cần thiết lập HTTPS trước khi sử dụng — xem hướng dẫn chi tiết trong file AGENTS.md (mục Tên miền & HTTPS).

### Có hoá đơn điện tử không?

Kho Việt hỗ trợ nhập hoá đơn điện tử đầu vào từ file XML: đọc thông tin nhà cung cấp, danh sách hàng hoá, thuế suất VAT, và tự động tạo phiếu nhập kho tương ứng. Đây là tính năng nhập liệu từ e-invoice, không phải phát hành hoá đơn điện tử đầu ra.

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

**Kho Việt** is a free, open-source warehouse/inventory management system designed for Vietnamese SMBs.
Self-hosted with Docker, it gives you full control over your data on your own server.

- **Multi-industry support:** F&B (restaurants — recipes, processing, expiry tracking), Fashion (size/color variants, barcode, customer returns), and Retail — with per-feature toggle.
- **Purchasing & stock operations:** purchase requests → purchase orders → stock-in with approval, stock-out, stocktake, batch tracking, and supplier payment management.
- **Tax & e-invoice:** VAT computation (deduction and household regimes), tax period books, and e-invoice XML import for inbound invoices.
- **AI-assisted installation:** paste one sentence into any AI assistant (Claude, ChatGPT, Cursor, Copilot) and it follows [AGENTS.md](AGENTS.md) to set up everything — Docker, config, HTTPS.

KiotViet POS integration syncs sales orders for automatic stock deduction and revenue tracking.
Licensed under AGPL-3.0-or-later.
