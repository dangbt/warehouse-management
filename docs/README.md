# Mâm Vị - Hệ Thống Quản Lý Kho Nhà Hàng

Hệ thống quản lý xuất nhập kho nguyên liệu cho nhà hàng, hỗ trợ mô hình **Bán thành phẩm (BTP)** — chế biến nguyên liệu thô thành bán thành phẩm với định mức quy đổi và hao hụt.

## Mô hình nghiệp vụ

```
NL Thô (Thịt bò nguyên khối 10kg)
  │
  ├─ Chế biến (ProcessingOrder) ─→ BTP (Thịt bò cắt lát 8kg, yieldRatio=0.8, lossRatio=0.2)
  │
  └─ Công thức (Recipe) ─→ Món ăn (MenuItem) ─→ Đồng bộ KiotViet ─→ Tự động trừ kho
```

- **Nguyên liệu** có thể là NL thô hoặc BTP (liên kết qua `sourceIngredientId`)
- **Chế biến (Processing)**: Phiếu chuyển đổi NL nguồn → BTP, theo dõi số lượng đầu vào/đầu ra, tỷ lệ hao hụt thực tế
- **Định mức quy đổi**: `yieldRatio` (tỷ lệ thành phẩm), `lossRatio` (hao hụt sơ chế)
- **Nhóm nguyên liệu**: Gom NL cùng loại (VD: Thịt bò khối + Thịt bò lát) quy về 1 đơn vị gốc (`baseFactor`) để báo cáo tồn tổng hợp
- **Đa đơn vị**: Mỗi NL có nhiều đơn vị quy đổi (kg, g, thùng...) với hệ số `factor`

## Tính năng chính

- Quản lý nguyên liệu (thô + BTP), nhóm, đa đơn vị, lô hàng (batch) + hạn sử dụng
- Nhập kho với workflow phê duyệt + Xuất kho thủ công
- **Chế biến**: NL thô → BTP, theo dõi hiệu suất thực tế vs định mức
- Công thức món ăn → tự động trừ kho theo đơn hàng KiotViet (POS)
- Menu: 3 chế độ trừ tồn — theo công thức (RECIPE), trừ thẳng NL (DIRECT), không quản tồn (NONE)
- Kiểm kê (stocktake) → điều chỉnh tồn kho
- Trả hàng NCC + công nợ + thanh toán nhà cung cấp
- Phân quyền RBAC + Audit logs
- Báo cáo: tồn kho, tiêu hao, chênh lệch định mức, cảnh báo hết hạn

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

> Tài liệu thiết kế mô tả ý định ban đầu. Để biết hành vi chính xác, ưu tiên `apps/api/prisma/schema.prisma` và source code.

## Cấu trúc Monorepo

```
apps/
  api    → NestJS + Prisma + PostgreSQL (global prefix /api/v1)
  web    → React + TanStack Router/Query + Tailwind v4
packages/
  shared       → Shared utilities
  ui-winforms  → UI components (WinForms theme + TanStack Table)
```

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Backend | NestJS, TypeScript, Prisma, PostgreSQL, JWT + bcryptjs |
| Frontend | React 19, TanStack Router + Query, Zustand, Tailwind CSS v4, @dangbt/pro-ui |
| Table | @tanstack/react-table (sorting, visibility, extensible) |
| Monorepo | Turborepo + npm workspaces |
| Test | Vitest (web), Jest (api) |

## Getting Started

```bash
npm install

# Backend
cd apps/api
cp .env.example .env        # cấu hình DATABASE_URL
npx prisma migrate dev
npx prisma db seed

# Chạy toàn bộ
npm run dev                 # từ root (turbo)
```

Tài khoản seed (mật khẩu `123456`): `admin@wms.vn`, `kho@wms.vn`, `bep@wms.vn`.
