# Entity Relationship Diagram

## Hệ Thống Quản Lý Kho Nguyên Liệu

> Đồng bộ với `apps/api/prisma/schema.prisma` (2026-06-26).

---

## Diagram (Mermaid)

```mermaid
erDiagram
    departments ||--o{ users : "has"
    users ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "has"
    roles ||--o{ role_permissions : "has"

    users ||--o{ audit_logs : "creates"
    users ||--o{ import_orders : "creates"
    users ||--o{ import_orders : "approves"
    users ||--o{ stock_transactions : "creates"
    users ||--o{ stocktake_sessions : "creates"
    users ||--o{ purchase_returns : "creates"
    users ||--o{ supplier_payments : "creates"

    suppliers ||--o{ import_orders : "supplies"
    suppliers ||--o{ purchase_returns : "returned_to"
    suppliers ||--o{ supplier_payments : "paid_to"
    import_orders ||--o{ import_order_items : "contains"
    ingredients ||--o{ import_order_items : "included_in"
    import_order_items ||--|| ingredient_batches : "creates"

    ingredients ||--o{ ingredient_batches : "stored_as"
    ingredients ||--o{ stock_transactions : "tracked_by"
    ingredients ||--o{ recipe_ingredients : "used_in"
    ingredients ||--o{ stocktake_items : "counted_in"
    ingredients ||--o{ purchase_return_items : "returned_in"

    recipes ||--o{ recipe_ingredients : "contains"
    menu_items ||--|| recipes : "has"
    menu_items ||--o{ kiotviet_order_items : "mapped_to"
    kiotviet_orders ||--o{ kiotviet_order_items : "contains"

    stocktake_sessions ||--o{ stocktake_items : "contains"
    purchase_returns ||--o{ purchase_return_items : "contains"

    departments {
        uuid id PK
        varchar name
        varchar code UK
        text description
        timestamp created_at
    }

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar phone
        varchar avatar_url
        uuid department_id FK
        boolean is_active
        timestamp last_login_at
        timestamp created_at
    }

    roles {
        uuid id PK
        varchar name
        varchar code UK
        text description
    }

    user_roles {
        uuid user_id FK
        uuid role_id FK
    }

    role_permissions {
        uuid id PK
        uuid role_id FK
        varchar resource
        varchar action
    }

    ingredients {
        uuid id PK
        varchar name UK
        varchar unit
        decimal min_stock
        decimal current_stock
        decimal cost_per_unit
        varchar category
        timestamp created_at
    }

    suppliers {
        uuid id PK
        varchar name
        varchar phone
        text address
        text note
        decimal total_debt
    }

    import_orders {
        uuid id PK
        varchar code UK
        uuid supplier_id FK
        decimal total_amount
        varchar status
        boolean paid
        uuid created_by FK
        uuid approved_by FK
        text note
        timestamp created_at
    }

    import_order_items {
        uuid id PK
        uuid import_order_id FK
        uuid ingredient_id FK
        decimal quantity
        decimal unit_price
        decimal total_price
        date expiry_date
    }

    ingredient_batches {
        uuid id PK
        uuid ingredient_id FK
        uuid import_order_item_id FK_UK
        varchar batch_code
        decimal quantity
        decimal cost_per_unit
        date expiry_date
        timestamp received_date
        varchar status
        text note
        timestamp created_at
    }

    stock_transactions {
        uuid id PK
        uuid ingredient_id FK
        varchar type
        decimal quantity
        decimal unit_price
        decimal total_price
        varchar reference_id
        text note
        uuid created_by FK
        timestamp created_at
    }

    menu_items {
        uuid id PK
        varchar name
        decimal price
        varchar category
        boolean is_active
    }

    recipes {
        uuid id PK
        uuid menu_item_id FK_UK
        varchar name
        int serving_size
    }

    recipe_ingredients {
        uuid id PK
        uuid recipe_id FK
        uuid ingredient_id FK
        decimal quantity
        varchar unit
        text note
    }

    kiotviet_orders {
        uuid id PK
        varchar kiotviet_id UK
        varchar code
        varchar customer_name
        decimal total_amount
        varchar status
        boolean deducted
        timestamp order_date
        timestamp synced_at
    }

    kiotviet_order_items {
        uuid id PK
        uuid order_id FK
        varchar product_name
        uuid menu_item_id FK
        int quantity
        decimal price
    }

    stocktake_sessions {
        uuid id PK
        varchar code UK
        varchar status
        text note
        uuid created_by FK
        timestamp completed_at
        timestamp created_at
    }

    stocktake_items {
        uuid id PK
        uuid session_id FK
        uuid ingredient_id FK
        decimal system_qty
        decimal actual_qty
        decimal difference
        text note
    }

    purchase_returns {
        uuid id PK
        varchar code UK
        uuid supplier_id FK
        decimal total_amount
        varchar reason
        text note
        uuid created_by FK
        timestamp created_at
    }

    purchase_return_items {
        uuid id PK
        uuid return_id FK
        uuid ingredient_id FK
        decimal quantity
        decimal unit_price
        decimal total_price
    }

    supplier_payments {
        uuid id PK
        uuid supplier_id FK
        decimal amount
        varchar method
        text note
        uuid created_by FK
        timestamp created_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar resource
        varchar resource_id
        jsonb old_values
        jsonb new_values
        varchar ip_address
        varchar user_agent
        jsonb metadata
        timestamp created_at
    }
```

---

## Enum / String values (lưu dạng string)

| Field                     | Giá trị                                                |
| ------------------------- | ------------------------------------------------------ |
| import_orders.status      | PENDING, COMPLETED, REJECTED                           |
| stock_transactions.type   | IMPORT, EXPORT, ORDER_DEDUCT, RETURN, STOCKTAKE_ADJUST |
| ingredient_batches.status | ACTIVE, DEPLETED                                       |
| stocktake_sessions.status | DRAFT, COMPLETED                                       |
| kiotviet_orders.status    | SYNCED (mặc định)                                      |
| supplier_payments.method  | CASH, TRANSFER                                         |

---

## Relationships Summary

| From               | To                    | Rel | Mô tả                             |
| ------------------ | --------------------- | --- | --------------------------------- |
| departments        | users                 | 1:N | 1 bộ phận có nhiều user           |
| users              | user_roles            | 1:N | 1 user có nhiều role              |
| roles              | user_roles            | 1:N | 1 role gán cho nhiều user         |
| roles              | role_permissions      | 1:N | 1 role có nhiều permission        |
| users              | audit_logs            | 1:N | 1 user có nhiều log               |
| suppliers          | import_orders         | 1:N | 1 NCC có nhiều phiếu nhập         |
| suppliers          | purchase_returns      | 1:N | 1 NCC có nhiều phiếu trả hàng     |
| suppliers          | supplier_payments     | 1:N | 1 NCC có nhiều lần thanh toán     |
| import_orders      | import_order_items    | 1:N | 1 phiếu có nhiều dòng             |
| import_order_items | ingredient_batches    | 1:1 | mỗi dòng nhập tạo 1 lô            |
| ingredients        | ingredient_batches    | 1:N | 1 NL có nhiều lô                  |
| ingredients        | stock_transactions    | 1:N | 1 NL có nhiều giao dịch           |
| ingredients        | recipe_ingredients    | 1:N | 1 NL dùng trong nhiều recipe      |
| ingredients        | stocktake_items       | 1:N | 1 NL có trong nhiều phiên kiểm kê |
| menu_items         | recipes               | 1:1 | 1 món có 1 công thức              |
| menu_items         | kiotviet_order_items  | 1:N | 1 món map nhiều dòng order POS    |
| recipes            | recipe_ingredients    | 1:N | 1 công thức có nhiều NL           |
| kiotviet_orders    | kiotviet_order_items  | 1:N | 1 order có nhiều dòng             |
| stocktake_sessions | stocktake_items       | 1:N | 1 phiên kiểm kê có nhiều dòng     |
| purchase_returns   | purchase_return_items | 1:N | 1 phiếu trả có nhiều dòng         |
