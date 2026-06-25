# Warehouse Management System - Nhà Hàng

Hệ thống quản lý xuất nhập kho nguyên liệu cho nhà hàng.

## Tính năng chính
- Quản lý nguyên liệu, nhà cung cấp
- Nhập/xuất kho với workflow phê duyệt
- Công thức món ăn → tự động trừ kho khi có order
- Phân quyền theo bộ phận (RBAC)
- Audit logs mọi hoạt động
- Báo cáo, cảnh báo tồn kho thấp

## Documentation

```
docs/
├── PLAN.md                          # Kế hoạch tổng thể
├── CHANGELOG.md                     # Lịch sử thay đổi
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

## Tech Stack
- **Backend:** NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend:** React + @dangbt/pro-ui + Tailwind CSS v4
- **Infra:** Redis, Bull Queue, Docker

## Getting Started
> Coming soon - sau khi implement Phase 0
