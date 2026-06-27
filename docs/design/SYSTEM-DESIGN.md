# System Design Document (SDD)

## Hệ Thống Quản Lý Xuất Nhập Kho Nguyên Liệu Nhà Hàng

| Thông tin | Chi tiết               |
| --------- | ---------------------- |
| Phiên bản | 1.1                    |
| Ngày tạo  | 2026-06-25             |
| Cập nhật  | 2026-06-26 (sync code) |

---

## 0. Trạng Thái Triển Khai (vs thiết kế gốc)

Tài liệu này mô tả thiết kế dự kiến. Khác biệt so với code hiện tại:

- **Redis / Bull Queue:** CHƯA tích hợp. Auto-deduct chạy đồng bộ trong DB transaction, không qua queue/cache.
- **Trừ kho tự động:** KHÔNG qua webhook từ Order Service. Thực tế: đồng bộ order từ **KiotViet (POS)** rồi gọi endpoint `POST /kiotviet/orders/:id/deduct`.
- **Auth:** chỉ có access token (login). CHƯA có refresh token, logout, rate limiting/khoá tài khoản.
- **Swagger/OpenAPI:** CHƯA bật.
- **Module mới (đã có trong code, ngoài thiết kế gốc):** `batches` (lô + HSD), `stocktake` (kiểm kê), `purchase-returns` (trả hàng NCC + công nợ), `supplier-payments` (thanh toán NCC), `kiotviet` (tích hợp POS).
- **Monorepo:** Turborepo + npm workspaces (`apps/api`, `apps/web`, `apps/e2e`, `packages/*`); global prefix API `/api/v1`.

---

## 1. Kiến Trúc Tổng Quan

### 1.1 Architecture Style: Modular Monolith

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)                │
│              @dangbt/pro-ui + TailwindCSS         │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS / REST API
                       ▼
┌─────────────────────────────────────────────────┐
│                 API Gateway / NestJS              │
├─────────────────────────────────────────────────┤
│  Auth Module │ User Module │ Audit Module        │
├──────────────┼─────────────┼────────────────────┤
│  Ingredient  │  Import     │  Export             │
│  Module      │  Module     │  Module             │
├──────────────┼─────────────┼────────────────────┤
│  Recipe      │  Stock      │  Report             │
│  Module      │  Deduct     │  Module             │
└──────────────┴──────┬──────┴────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │PostgreSQL│ │  Redis   │ │  Bull    │
   │  (Data)  │ │ (Cache)  │ │ (Queue)  │
   └──────────┘ └──────────┘ └──────────┘
```

### 1.2 Lý do chọn Modular Monolith

- Dự án vừa phải, team nhỏ
- Dễ deploy, debug
- Vẫn tách module rõ ràng, dễ tách microservice sau nếu cần

---

## 2. Tech Stack Chi Tiết

| Component         | Technology                                 | Lý do                                      |
| ----------------- | ------------------------------------------ | ------------------------------------------ |
| Backend Framework | NestJS                                     | Modular, TypeScript, DI                    |
| Language          | TypeScript                                 | Type safety                                |
| Database          | PostgreSQL                                 | JSONB cho audit, reliable                  |
| ORM               | Prisma                                     | Type-safe queries, migrations              |
| Cache             | Redis _(planned)_                          | Session, stock cache — chưa dùng           |
| Queue             | Bull + Redis _(planned)_                   | Async stock deduct — chưa dùng             |
| Auth              | JWT (Passport)                             | Stateless (access token; refresh chưa làm) |
| Frontend          | React + Vite                               | Fast, modern                               |
| Routing/Data      | TanStack Router + TanStack Query + Zustand | Routing, server state, store               |
| UI Library        | @dangbt/pro-ui                             | Consistent UI                              |
| CSS               | Tailwind CSS v4                            | Utility-first                              |
| Charts/Forms      | recharts + react-hook-form                 | Báo cáo + form                             |
| Test              | Jest (api), Vitest (web), Playwright (e2e) | Unit + E2E                                 |
| API Docs          | Swagger/OpenAPI _(planned)_                | Chưa bật                                   |

---

## 3. Module Design

### 3.1 Auth Module

```
auth/
├── auth.controller.ts      # login, logout, refresh
├── auth.service.ts         # validate, generate tokens
├── strategies/
│   ├── jwt.strategy.ts     # JWT validation
│   └── local.strategy.ts   # email+password
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── permissions.guard.ts
└── decorators/
    ├── current-user.decorator.ts
    ├── roles.decorator.ts
    └── permissions.decorator.ts
```

### 3.2 Audit Module

```
audit/
├── audit.controller.ts     # query logs
├── audit.service.ts        # create log entries
├── audit.interceptor.ts    # auto-log CUD operations
└── audit.interface.ts      # AuditLog type
```

**Interceptor hoạt động:**

- Chạy trước + sau mỗi request
- Snapshot data trước khi thay đổi (old_values)
- Capture response (new_values)
- Ghi audit_logs async (không block response)

### 3.x Module thực tế (NestJS, dưới `apps/api/src/modules`)

`auth`, `users`, `common` (departments/roles/menu-items), `ingredients`, `batches`, `suppliers`, `import-orders`, `stock-exports`, `recipes`, `kiotviet`, `stocktake`, `purchase-returns`, `supplier-payments`, `audit-logs`, `reports`.

### 3.3 Stock Deduct Flow (thực tế: KiotViet, không phải webhook)

```
KiotViet (POS) ──sync──► kiotviet_orders (deducted=false)
                              │  POST /kiotviet/orders/:id/deduct
                              ▼
                    StockDeductService
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              Get Recipe  Check Stock  Deduct
                    │         │         │
                    └─────────┼─────────┘
                              ▼
                     Transaction (atomic)
                    ┌─────────────────────┐
                    │ UPDATE ingredients   │
                    │ INSERT transactions  │
                    │ INSERT audit_logs    │
                    └─────────────────────┘
                              │
                              ▼
                    Check low stock → Alert
```

**Quan trọng:** Toàn bộ deduct phải trong 1 DB transaction để đảm bảo consistency.

---

## 4. Database Design

### 4.1 ER Diagram (simplified)

```
users ──┬── user_roles ──── roles ──── role_permissions
        │
        ├── departments
        │
        ├── audit_logs
        │
        ├── import_orders ──── import_order_items ──┐
        │                                           │
        └── stock_transactions ◄────────────────────┤
                    │                               │
                    ▼                               │
              ingredients ◄─── recipe_ingredients ──┤
                    ▲                               │
                    │                               │
              suppliers                      recipes ──── menu_items
```

### 4.2 Indexing Strategy

| Table              | Index                       | Lý do            |
| ------------------ | --------------------------- | ---------------- |
| ingredients        | (category, name)            | Filter + search  |
| stock_transactions | (ingredient_id, created_at) | History query    |
| stock_transactions | (reference_id, type)        | Lookup by order  |
| audit_logs         | (user_id, created_at)       | User activity    |
| audit_logs         | (resource, resource_id)     | Resource history |
| import_orders      | (status, created_at)        | Pending list     |

---

## 5. API Design Conventions

### 5.1 URL Pattern

```
GET    /api/v1/{resource}          # List (paginated)
POST   /api/v1/{resource}          # Create
GET    /api/v1/{resource}/:id      # Get detail
PUT    /api/v1/{resource}/:id      # Update
DELETE /api/v1/{resource}/:id      # Delete
PUT    /api/v1/{resource}/:id/{action}  # Custom action (approve, cancel)
```

### 5.2 Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### 5.3 Error Format

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Không đủ tồn kho",
    "details": { "ingredient_id": "...", "required": 5, "available": 2 }
  }
}
```

---

## 6. Security Design

### 6.1 Authentication Flow

```
Login → Access Token (JWT)        # refresh token: PLANNED, chưa làm
     → Mỗi request gửi Access Token trong Authorization header
     → Token expired → login lại
```

> Thiết kế gốc dự kiến access (15m) + refresh (7d). Hiện code chỉ phát access token khi login.

### 6.2 Authorization Flow

```
Request → JwtAuthGuard (verify token)
       → RolesGuard (check user roles)
       → PermissionsGuard (check resource:action)
       → Controller
```

---

## 7. Deployment

### 7.1 Environments

| Env         | Mô tả                  |
| ----------- | ---------------------- |
| Development | Local, Docker Compose  |
| Staging     | Test before production |
| Production  | Live system            |

### 7.2 Docker Compose (Development)

```yaml
services:
  api:
    build: ./backend
    ports: ['3000:3000']
  frontend:
    build: ./frontend
    ports: ['5173:5173']
  postgres:
    image: postgres:16
    ports: ['5432:5432']
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
```
