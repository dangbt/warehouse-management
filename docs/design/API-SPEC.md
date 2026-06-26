# API Specification

## Base URL: `/api/v1`

> Đồng bộ với controllers hiện tại (2026-06-26). Mọi route (trừ `auth/login`, `health`) yêu cầu
> `Authorization: Bearer <token>` (JwtAuthGuard) và permission tương ứng (PermissionsGuard).

---

## Authentication

### POST /auth/login

```json
// Request
{ "email": "admin@wms.vn", "password": "123456" }

// Response 200
{
  "access_token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "admin@wms.vn",
    "full_name": "Nguyễn Văn A",
    "department": { "id": "uuid", "name": "Quản lý", "code": "MANAGER" },
    "roles": ["admin"],
    "permissions": ["ingredients:read", "ingredients:create", "..."]
  }
}
```

> Chưa implement: `POST /auth/refresh`, `POST /auth/logout`, `PUT /auth/change-password`.

### GET /health

- Healthcheck, không cần auth.

---

## Users

### GET /users — `users:read`

### POST /users — tạo user

```json
{
  "email": "new@wms.vn",
  "password": "default123",
  "full_name": "Tran Van B",
  "phone": "0901234567",
  "department_id": "uuid",
  "role_ids": ["uuid"]
}
```

### PUT /users/:id — cập nhật user (gồm role_ids)

### PUT /users/:id/toggle-active — bật/tắt is_active (soft delete)

---

## Common: Departments / Roles / Menu

### GET /departments

### GET /roles

### POST /roles

```json
{ "name": "Warehouse Staff", "code": "warehouse_staff", "description": "Nhân viên kho" }
```

### PUT /roles/:id/permissions

```json
{
  "permissions": [
    { "resource": "ingredients", "action": "create" },
    { "resource": "ingredients", "action": "read" }
  ]
}
```

### GET /menu-items

---

## Ingredients

### GET /ingredients — `ingredients:read`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Thịt bò Úc",
      "unit": "kg",
      "min_stock": 5,
      "current_stock": 12.5,
      "cost_per_unit": 450000,
      "category": "Thịt"
    }
  ]
}
```

### POST /ingredients — `ingredients:create`

```json
{ "name": "Thịt bò Úc", "unit": "kg", "min_stock": 5, "cost_per_unit": 450000, "category": "Thịt" }
```

### PUT /ingredients/:id — `ingredients:update`

### DELETE /ingredients/:id — `ingredients:delete`

> Không có `/ingredients/:id/history` — lịch sử nằm ở stock_transactions / batches.

---

## Batches

### GET /batches — `ingredients:read`

- Danh sách lô nguyên liệu (quantity, cost_per_unit, expiry_date, status ACTIVE/DEPLETED).

### GET /reports/expiring — `ingredients:read`

- Các lô sắp/đã hết hạn.

---

## Suppliers

### GET /suppliers — `suppliers:read`

- Trả về cả `total_debt` (công nợ).

### POST /suppliers — `suppliers:create`

```json
{ "name": "Cty TNHH ABC", "phone": "0281234567", "address": "123 Đường XYZ", "note": "" }
```

### PUT /suppliers/:id — `suppliers:update`

### DELETE /suppliers/:id — `suppliers:delete`

---

## Import Orders

### GET /import-orders — `import_orders:read`

### POST /import-orders — `import_orders:create`

```json
{
  "supplier_id": "uuid",
  "paid": false,
  "note": "Nhập hàng tuần",
  "items": [
    { "ingredient_id": "uuid", "quantity": 10, "unit_price": 450000, "expiry_date": "2026-07-25" },
    { "ingredient_id": "uuid", "quantity": 20, "unit_price": 35000 }
  ]
}
```

### PUT /import-orders/:id/approve — `import_orders:approve`

- status → COMPLETED, tăng tồn kho, ghi `IMPORT`, tạo lô; nếu `paid=false` → cộng công nợ NCC.

### PUT /import-orders/:id/reject — `import_orders:approve`

- status → REJECTED.

> Không có endpoint cancel.

---

## Stock Exports

### GET /stock-exports — `stock_exports:read`

### POST /stock-exports — `stock_exports:create`

```json
{ "items": [{ "ingredient_id": "uuid", "quantity": 2, "note": "Hỏng do tủ lạnh hư" }] }
```

- Trừ tồn kho, ghi `EXPORT`.

---

## Recipes

### GET /recipes — `recipes:read`

### POST /recipes — `recipes:create`

```json
{
  "menu_item_id": "uuid",
  "name": "Phở bò tái",
  "serving_size": 1,
  "ingredients": [
    { "ingredient_id": "uuid", "quantity": 0.15, "unit": "kg", "note": "Thịt bò tái" },
    { "ingredient_id": "uuid", "quantity": 0.25, "unit": "kg", "note": "Bánh phở" }
  ]
}
```

### PUT /recipes/:id — `recipes:update`

> Chưa có GET /recipes/:id và DELETE.

---

## KiotViet (POS)

### GET /kiotviet/orders — `kiotviet:read`

### POST /kiotviet/sync — `kiotviet:sync`

- Đồng bộ order thủ công (payload mẫu / dữ liệu test).

### POST /kiotviet/sync-api — `kiotviet:sync`

- Đồng bộ qua API KiotViet.

### POST /kiotviet/orders/:id/deduct — `kiotviet:deduct`

- Với mỗi item → map menu_item → lấy recipe → trừ tồn (`ORDER_DEDUCT`), đánh dấu `deducted=true`.

---

## Stocktake (Kiểm kê)

### GET /stocktake — `stocktake:read`

### POST /stocktake — `stocktake:create`

- Tạo phiên DRAFT, snapshot system_qty từ current_stock của mọi nguyên liệu.

```json
{ "note": "Kiểm kê cuối tháng" }
```

### GET /stocktake/:id — `stocktake:read`

### PUT /stocktake/:id/items — `stocktake:create`

```json
{ "items": [{ "ingredient_id": "uuid", "actual_qty": 11.8, "note": "" }] }
```

### POST /stocktake/:id/complete — `stocktake:complete`

- current_stock = actual_qty, ghi `STOCKTAKE_ADJUST`, status → COMPLETED.

---

## Purchase Returns (Trả hàng NCC)

### GET /purchase-returns — `purchase_returns:read`

### POST /purchase-returns — `purchase_returns:create`

```json
{
  "supplier_id": "uuid",
  "reason": "Hàng kém chất lượng",
  "note": "",
  "items": [{ "ingredient_id": "uuid", "quantity": 2, "unit_price": 450000 }]
}
```

- Trừ tồn (`RETURN`), giảm công nợ NCC.

---

## Supplier Payments (Thanh toán NCC)

### GET /supplier-payments — `supplier_payments:read`

### POST /supplier-payments — `supplier_payments:create`

```json
{ "supplier_id": "uuid", "amount": 5000000, "method": "TRANSFER", "note": "Trả nợ tháng 6" }
```

- method ∈ `CASH | TRANSFER`; giảm `supplier.total_debt`.

---

## Audit Logs

### GET /audit-logs — `audit_logs:read`

```json
{
  "data": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "full_name": "Nguyễn Văn A" },
      "action": "IMPORT_ORDER_APPROVE",
      "resource": "import_orders",
      "resource_id": "uuid",
      "old_values": { "status": "PENDING" },
      "new_values": { "status": "COMPLETED" },
      "created_at": "2026-06-26T10:30:00Z"
    }
  ]
}
```

---

## Reports

### GET /reports/stock-summary

- Tổng hợp tồn kho + giá trị.

### GET /reports/stock-movement

- Biến động xuất/nhập theo thời gian.

### GET /reports/ingredient-usage

- Tiêu hao nguyên liệu.

### GET /reports/consumption-variance

- Chênh lệch giữa tiêu hao thực tế và định mức theo công thức.

> `/reports/expiring` thuộc nhóm Batches (xem trên).
