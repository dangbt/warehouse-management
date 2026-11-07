# CLAUDE.md

Hướng dẫn cho mọi AI agent làm việc trên repo này.

## ⛔ RULES (bắt buộc)

1. **KHÔNG tự ý sửa test case / file spec** (e2e, unit, integration...) khi chưa được người dùng cho phép.
   - Khi test fail: báo cáo nguyên nhân + đề xuất hướng sửa, nhưng **CHỜ người dùng đồng ý** rồi mới đụng vào file test.
   - Được tự do sửa **code nguồn** để test pass; chỉ riêng **file test** thì phải xin phép.
   - Lý do: người dùng muốn kiểm soát test, tránh việc test bị chỉnh để "pass" mà không phản ánh đúng hành vi mong muốn.

## Tổng quan project

Hệ thống quản lý xuất nhập kho nguyên liệu nhà hàng (monorepo Turborepo + npm workspaces).

- `apps/api` — NestJS + Prisma + PostgreSQL (global prefix `/api/v1`)
- `apps/web` — React + TanStack Router/Query + Zustand + Tailwind v4 + @dangbt/pro-ui
- `apps/e2e` — Playwright
- `packages/shared`, `packages/ui-winforms`

Tài liệu chi tiết ở `docs/` (PLAN.md, design/ERD.md, design/API-SPEC.md...). Nguồn sự thật cuối cùng là `apps/api/prisma/schema.prisma` + source code.

## Quy ước

- Status/enum lưu English trong DB, hiển thị tiếng Việt ở UI.
- DB Neon: cấu hình `DATABASE_URL` trong `apps/api/.env` (đã gitignore).
- Pre-commit hook (lint/build/test/e2e) có thể fail do môi trường (oxlint/native binding); commit khi cần dùng `--no-verify` và nêu rõ lý do.

## Ngành nghề (business profile) & feature flags

- **Ingredient = mã hàng (item/SKU) dùng chung mọi ngành.** Model/route/API `Ingredient` giữ nguyên tên trong code; chỉ nhãn hiển thị đổi theo profile (F&B: "Nguyên liệu", thời trang: "Sản phẩm", bán lẻ: "Hàng hoá") qua `useTerm()` (`apps/web/src/utils/terms.ts`). Không hardcode chuỗi "Nguyên liệu" ở UI mới — dùng `t('item')`.
- Mỗi khách hàng = 1 deploy + DB riêng. Profile (`FNB | FASHION | RETAIL`) và override flag lưu bảng `app_settings`; chưa có trong DB thì lấy env `BUSINESS_PROFILE` (mặc định `FNB`).
- API: `GET /settings/features` (mọi user đăng nhập), `PUT /settings/features` (quyền `settings:update`, ghi audit log kèm old/new). Module tắt trả 404 với `code: FEATURE_DISABLED` qua `FeatureGuard` + `@RequireFeature('<flag>')`.
- **Thêm flag mới:**
  1. `apps/api/src/modules/settings/business-profile.ts`: thêm vào `FEATURE_KEYS` và giá trị cho cả 3 profile trong `PROFILE_FEATURES` (FNB phải giữ hành vi hiện tại).
  2. Controller: `@UseGuards(..., FeatureGuard)` + `@RequireFeature('<flag>')`.
  3. Web: thêm vào `FEATURE_KEYS` + `FNB_DEFAULT` (`apps/web/src/data/use-features.ts`), nhãn trong `features/settings/business-profile-page.tsx`; ẩn menu/route bằng `utils/route-features.ts` (+ `app-layout.tsx`) hoặc `<FeatureGate feature="...">`.
  4. Thêm test ở `business-profile.spec.ts` / `feature.guard.spec.ts`.
- Thêm thuật ngữ mới: thêm key vào `FNB` trong `utils/terms.ts` rồi override ở profile khác nếu cần.
