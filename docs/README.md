# Warehouse Management System - Nhà Hàng

Hệ thống quản lý xuất nhập kho nguyên liệu cho nhà hàng.

## Tính năng chính

- Quản lý nguyên liệu, nhà cung cấp, lô hàng (batch) + hạn sử dụng
- Nhập kho với workflow phê duyệt (approve / reject) + xuất kho thủ công
- Công thức món ăn (recipe) → tự động trừ kho theo order đồng bộ từ KiotViet (POS)
- Kiểm kê (stocktake) → điều chỉnh tồn kho
- Trả hàng NCC + công nợ + thanh toán nhà cung cấp
- Phân quyền theo vai trò (RBAC) + Audit logs mọi hoạt động
- Báo cáo tồn kho, biến động, tiêu hao, chênh lệch định mức; cảnh báo lô sắp hết hạn

## Documentation

```
docs/
├── PLAN.md                          # Trạng thái hệ thống (schema, RBAC, flows, API, phases)
├── CHANGELOG.md                     # Tiến độ theo phase
├── PROJECT-GLOSSARY.md              # Thuật ngữ dự án
├── README.md                        # File này
├── requirements/
│   ├── SRS.md                       # Software Requirements Specification
│   └── USE-CASES.md                 # Use Cases chi tiết
├── design/
│   ├── SYSTEM-DESIGN.md             # System Design Document
│   ├── ERD.md                       # Entity Relationship Diagram
│   ├── API-SPEC.md                  # API Specification
│   └── frontend/
│       ├── UI-DESIGN.md             # UI Design (WinForms style)
│       ├── COMPONENT-SPEC.md        # Component structure & specs
│       ├── WINFORMS-THEME.md        # CSS theme (colors, spacing)
│       └── SCREEN-FLOWS.md          # Screen flows & user journeys
└── testing/
    └── TEST-PLAN.md                 # Test Plan
```

> Tài liệu thiết kế mô tả ý định ban đầu. Để biết hành vi chính xác, ưu tiên `apps/api/prisma/schema.prisma` và source code. PLAN.md / CHANGELOG.md / ERD.md / API-SPEC.md đã được đồng bộ với code (2026-06-26).

## Cấu trúc Monorepo

```
apps/
  api    → NestJS + Prisma + PostgreSQL (backend, global prefix /api/v1)
  web    → React + TanStack Router/Query + Tailwind v4 + @dangbt/pro-ui
  e2e    → Playwright end-to-end tests
packages/
  shared       → code dùng chung
  ui-winforms  → component theme WinForms
```

## Tech Stack

- **Backend:** NestJS + TypeScript + Prisma + PostgreSQL, JWT (passport-jwt) + bcryptjs
- **Frontend:** React + TanStack Router + TanStack Query + Zustand + react-hook-form + recharts + @dangbt/pro-ui + Tailwind CSS v4
- **Monorepo / Test:** Turborepo + npm workspaces; Jest (api), Vitest (web), Playwright (e2e)
- _Chưa tích hợp:_ Redis / Bull Queue (auto-deduct chạy đồng bộ), refresh token

## Getting Started

```bash
# Cài dependencies (root)
npm install

# Backend: cấu hình DATABASE_URL trong apps/api/.env rồi:
cd apps/api
npx prisma migrate dev      # chạy migrations
npx prisma db seed          # seed departments, roles, users, ingredients, recipe

# Chạy toàn bộ (turbo)
npm run dev                 # từ root
```

Tài khoản seed (mật khẩu `123456`): `admin@wms.vn`, `kho@wms.vn`, `bep@wms.vn`.
