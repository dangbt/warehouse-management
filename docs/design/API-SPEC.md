# API Specification

## Base URL: `/api/v1`

---

## Authentication

### POST /auth/login

```json
// Request
{ "email": "user@restaurant.com", "password": "secret123" }

// Response 200
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "email": "user@restaurant.com",
      "full_name": "Nguyen Van A",
      "department": { "id": "uuid", "name": "Kho", "code": "WAREHOUSE" },
      "roles": ["warehouse_staff"],
      "permissions": ["ingredients:read", "ingredients:create", ...]
    }
  }
}

// Response 401
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Email hoặc mật khẩu không đúng" } }
```

### POST /auth/refresh

```json
// Request
{ "refresh_token": "eyJ..." }
// Response 200
{ "success": true, "data": { "access_token": "eyJ...", "expires_in": 900 } }
```

### PUT /auth/change-password

```json
// Request (Authorization: Bearer <token>)
{ "old_password": "old123", "new_password": "new123" }
```

---

## Users

### GET /users

- **Permission:** `users:read`
- **Query:** `?page=1&limit=20&department_id=uuid&role_id=uuid&is_active=true&search=keyword`

### POST /users

- **Permission:** `users:create`

```json
{
  "email": "new@restaurant.com",
  "password": "default123",
  "full_name": "Tran Van B",
  "phone": "0901234567",
  "department_id": "uuid",
  "role_ids": ["uuid1", "uuid2"]
}
```

### PUT /users/:id

- **Permission:** `users:update`

### PUT /users/:id/toggle-active

- **Permission:** `users:update`

### PUT /users/:id/roles

- **Permission:** `users:update`

```json
{ "role_ids": ["uuid1", "uuid2"] }
```

---

## Departments

### GET /departments

### POST /departments

```json
{ "name": "Kho", "code": "WAREHOUSE", "description": "Bộ phận kho" }
```

---

## Roles & Permissions

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
    { "resource": "ingredients", "action": "read" },
    { "resource": "ingredients", "action": "update" },
    { "resource": "import_orders", "action": "create" },
    { "resource": "import_orders", "action": "read" }
  ]
}
```

---

## Ingredients

### GET /ingredients

- **Permission:** `ingredients:read`
- **Query:** `?page=1&limit=20&category=Thịt&low_stock=true&search=keyword`
- **Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Thịt bò Úc",
      "unit": "kg",
      "min_stock": 5,
      "current_stock": 12.5,
      "cost_per_unit": 450000,
      "category": "Thịt",
      "is_low_stock": false
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

### POST /ingredients

- **Permission:** `ingredients:create`

```json
{
  "name": "Thịt bò Úc",
  "unit": "kg",
  "min_stock": 5,
  "cost_per_unit": 450000,
  "category": "Thịt"
}
```

### GET /ingredients/:id/history

- **Query:** `?page=1&limit=50&type=IMPORT&from=2026-06-01&to=2026-06-25`

---

## Suppliers

### GET /suppliers

- **Query:** `?search=keyword&page=1&limit=20`

### POST /suppliers

```json
{ "name": "Cty TNHH ABC", "phone": "0281234567", "address": "123 Đường XYZ", "note": "" }
```

---

## Import Orders

### GET /import-orders

- **Query:** `?status=PENDING&supplier_id=uuid&from=2026-06-01&to=2026-06-25&page=1&limit=20`

### POST /import-orders

- **Permission:** `import_orders:create`

```json
{
  "supplier_id": "uuid",
  "note": "Nhập hàng tuần",
  "items": [
    { "ingredient_id": "uuid", "quantity": 10, "unit_price": 450000, "expiry_date": "2026-07-25" },
    { "ingredient_id": "uuid", "quantity": 20, "unit_price": 35000 }
  ]
}
```

### PUT /import-orders/:id/approve

- **Permission:** `import_orders:approve`

```json
{ "note": "Đã kiểm tra đầy đủ" }
```

### PUT /import-orders/:id/reject

- **Permission:** `import_orders:approve`

```json
{ "reason": "Giá cao hơn báo giá" }
```

### PUT /import-orders/:id/cancel

- **Permission:** `import_orders:approve`

```json
{ "reason": "NCC giao sai hàng" }
```

---

## Stock Exports

### POST /stock-exports

- **Permission:** `stock_exports:create`

```json
{
  "items": [{ "ingredient_id": "uuid", "quantity": 2, "reason": "DAMAGED", "note": "Hỏng do tủ lạnh hư" }]
}
```

- **Reason enum:** `DAMAGED | EXPIRED | RETURN | INTERNAL_USE | OTHER`

---

## Recipes

### GET /recipes

- **Query:** `?menu_item_id=uuid&search=keyword`

### POST /recipes

- **Permission:** `recipes:create`

```json
{
  "menu_item_id": "uuid",
  "name": "Phở bò tái",
  "serving_size": 1,
  "ingredients": [
    { "ingredient_id": "uuid", "quantity": 0.2, "unit": "kg", "note": "Thịt bò tái" },
    { "ingredient_id": "uuid", "quantity": 0.3, "unit": "kg", "note": "Bánh phở" },
    { "ingredient_id": "uuid", "quantity": 0.5, "unit": "lít", "note": "Nước dùng" }
  ]
}
```

### GET /recipes/:id

- Response bao gồm chi tiết ingredients

---

## Audit Logs

### GET /audit-logs

- **Permission:** `audit_logs:read`
- **Query:** `?user_id=uuid&action=IMPORT_ORDER_APPROVE&resource=import_orders&from=2026-06-01&to=2026-06-25&page=1&limit=50`
- **Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "full_name": "Nguyen Van A" },
      "action": "IMPORT_ORDER_APPROVE",
      "resource": "import_orders",
      "resource_id": "uuid",
      "old_values": { "status": "PENDING" },
      "new_values": { "status": "COMPLETED", "approved_by": "uuid" },
      "ip_address": "192.168.1.10",
      "created_at": "2026-06-25T10:30:00Z"
    }
  ]
}
```

### GET /audit-logs/resource/:resource/:id

- Lịch sử thay đổi của 1 bản ghi cụ thể

### GET /audit-logs/user/:userId

- Mọi hoạt động của 1 user

---

## Reports

### GET /reports/stock-summary

- **Query:** `?category=Thịt`
- **Response:** Tổng hợp tồn kho + giá trị

### GET /reports/stock-movement

- **Query:** `?ingredient_id=uuid&from=2026-06-01&to=2026-06-25&group_by=day`

### GET /reports/low-stock

- Danh sách nguyên liệu dưới mức min_stock

### GET /reports/cost-analysis

- **Query:** `?from=2026-06-01&to=2026-06-30`
- Chi phí theo thời gian, food cost per dish

---

## Webhook (nhận từ Order System)

### POST /webhooks/order-confirmed

```json
{
  "order_id": "uuid",
  "order_code": "ORD-20260625-001",
  "items": [
    { "menu_item_id": "uuid", "quantity": 2 },
    { "menu_item_id": "uuid", "quantity": 1 }
  ]
}
```

### POST /webhooks/order-cancelled

```json
{
  "order_id": "uuid",
  "order_code": "ORD-20260625-001"
}
```
