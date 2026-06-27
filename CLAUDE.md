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
