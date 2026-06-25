# Entity Relationship Diagram

## Hệ Thống Quản Lý Kho Nguyên Liệu

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

    suppliers ||--o{ import_orders : "supplies"
    import_orders ||--o{ import_order_items : "contains"
    ingredients ||--o{ import_order_items : "included_in"

    ingredients ||--o{ stock_transactions : "tracked_by"
    ingredients ||--o{ recipe_ingredients : "used_in"

    recipes ||--o{ recipe_ingredients : "contains"
    menu_items ||--|| recipes : "has"

    departments {
        uuid id PK
        varchar name
        varchar code
        text description
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
    }

    import_orders {
        uuid id PK
        varchar code UK
        uuid supplier_id FK
        decimal total_amount
        enum status
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

    stock_transactions {
        uuid id PK
        uuid ingredient_id FK
        enum type
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
        uuid menu_item_id FK
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

## Relationships Summary

| From | To | Relationship | Mô tả |
|------|----|-------------|--------|
| departments | users | 1:N | 1 bộ phận có nhiều user |
| users | user_roles | 1:N | 1 user có nhiều role |
| roles | user_roles | 1:N | 1 role gán cho nhiều user |
| roles | role_permissions | 1:N | 1 role có nhiều permission |
| users | audit_logs | 1:N | 1 user có nhiều log |
| users | import_orders | 1:N | 1 user tạo nhiều phiếu |
| suppliers | import_orders | 1:N | 1 NCC có nhiều phiếu nhập |
| import_orders | import_order_items | 1:N | 1 phiếu có nhiều dòng |
| ingredients | import_order_items | 1:N | 1 NL xuất hiện nhiều phiếu |
| ingredients | stock_transactions | 1:N | 1 NL có nhiều giao dịch |
| ingredients | recipe_ingredients | 1:N | 1 NL dùng trong nhiều recipe |
| menu_items | recipes | 1:1 | 1 món có 1 công thức |
| recipes | recipe_ingredients | 1:N | 1 công thức có nhiều NL |
