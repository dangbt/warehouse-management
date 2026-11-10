# Dựng khách hàng mới (1 khách = 1 instance)

Mỗi khách có **DB riêng + API riêng + web riêng**, cùng một codebase. Khác nhau chỉ ở env và dữ liệu seed.

| Thành phần | Dịch vụ | Mỗi khách có |
| --- | --- | --- |
| Database | Neon (PostgreSQL) | 1 project/DB |
| API | Render (web service) | 1 service |
| Web | Cloudflare Pages | 1 project |

## 1. Tạo database (Neon)

1. Neon → New Project (đặt tên theo khách), region gần khách.
2. Copy **connection string** (có `?sslmode=require`) → dùng làm `DATABASE_URL`.

## 2. Tạo API (Render)

1. New → Web Service, trỏ repo này. Cấu hình lấy từ `apps/api/render.yaml`:
   - Root Directory: `apps/api`
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - Start Command: `node dist/src/main.js`
2. Environment:

| Biến | Giá trị |
| --- | --- |
| `DATABASE_URL` | connection string Neon ở bước 1 |
| `JWT_SECRET` | chuỗi ngẫu nhiên dài (`openssl rand -hex 32`), **mỗi khách một giá trị** |
| `BUSINESS_PROFILE` | `FNB` \| `FASHION` \| `RETAIL` (profile mặc định khi DB chưa có cấu hình) |
| `NODE_ENV` | `production` |

3. Deploy. `prisma migrate deploy` tạo toàn bộ bảng trong DB trống.
4. Lấy Deploy Hook URL (Render → Settings) nếu muốn CI tự deploy (`RENDER_DEPLOY_HOOK_URL`).

## 3. Tạo web (Cloudflare Pages)

1. Pages → Create project (direct upload), đặt tên → là `CLOUDFLARE_PROJECT_NAME`.
2. Build web với biến `VITE_API_URL=https://<service>.onrender.com/api/v1`
   (CI: `.github/workflows/deploy-web.yml` đọc secret `VITE_API_URL`, `CLOUDFLARE_PROJECT_NAME`).
   Tay: `VITE_API_URL=... npm run build -w @wms/web && npx wrangler pages deploy apps/web/dist --project-name=<tên>`.
3. Với khách thứ hai trở đi, đặt secret/biến theo từng khách (environment riêng trên GitHub, hoặc deploy tay).

## 4. Khởi tạo dữ liệu — chọn 1 trong 2

### A. Wizard lần đầu (khuyên dùng cho khách mới)

Mở web lần đầu: khi DB **chưa có user nào**, trang đăng nhập tự chuyển sang `/setup`. Điền:
ngành nghề, tên doanh nghiệp, MST, địa chỉ (dùng cho in chứng từ), chế độ thuế, logo (tuỳ chọn), tài khoản admin.
Wizard seed nền tảng theo ngành rồi tạo admin. Xong là tự khoá:
`GET /setup/status` trả `needsSetup: false` và `POST /setup` trả 409.

### B. Seed bằng CLI

```bash
# từ root repo, DATABASE_URL trỏ DB của khách (apps/api/.env hoặc export)
npm run seed:profile -- --profile=FASHION   # FNB | FASHION | RETAIL
```

Tạo: vai trò + quyền mặc định (admin, warehouse_staff, accountant; FNB thêm kitchen_staff), kho chính, tiền tố chứng từ
(PN/PX/KK/TH/KT), danh mục mẫu, cấu hình thuế mặc định, và với FASHION: thuộc tính **Size** (XS–XXL, 28–36) + **Màu** cơ bản.
**Idempotent** — chạy lại không tạo trùng và không đè cấu hình đã chỉnh.
Script **không** tạo user: tạo admin qua wizard, hoặc `npx prisma db seed` (chỉ dev: tạo user demo) / SQL.

## 5. Branding (tên, logo, màu)

Tên/logo hiển thị ở thanh tiêu đề, trang đăng nhập và tab trình duyệt lấy từ `GET /api/v1/settings/branding`
(lưu trong bảng `app_settings`, key `branding`). Chưa cấu hình → mặc định **Kho Việt**.

- Wizard tự đặt tên theo tên doanh nghiệp (+ logo URL nếu nhập).
- Đổi sau này (cần quyền `settings:update`):
  `PUT /api/v1/settings/branding` body `{ "name": "...", "shortName": "AB", "logoUrl": "https://...", "primaryColor": "#0f766e" }`
  (`primaryColor` hex 6 ký tự, tuỳ chọn; gửi `""` để về màu mặc định).

## 6. Kiểm tra sau deploy

- [ ] `GET <api>/api/v1/health` OK
- [ ] Web mở → `/setup` (DB trống) → hoàn tất → đăng nhập bằng admin vừa tạo
- [ ] Menu đúng ngành (Thời trang có Sản phẩm/biến thể; F&B có Công thức/Thực đơn)
- [ ] Tên/logo đúng khách; Cấu hình thuế có sẵn tên/MST/địa chỉ

## Ghi chú

- Phương pháp giá xuất (WMS-6) chưa có trong codebase nên wizard chưa hỏi; sẽ thêm khi WMS-6 merge.
- Đổi `BUSINESS_PROFILE` sau khi đã cài đặt **không** có tác dụng nếu DB đã lưu profile — đổi ở menu Hệ thống → Ngành nghề.
