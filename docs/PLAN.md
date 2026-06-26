# Plan: Hệ Thống Quản Lý Xuất Nhập Kho Nguyên Liệu Nhà Hàng

## Tổng Quan

Hệ thống quản lý kho nguyên liệu cho nhà hàng:

- Nhập/xuất kho nguyên liệu
- Tự động trừ kho khi có order dựa trên công thức (recipe) món ăn
- Phân quyền theo bộ phận (Kho, Bếp, Bar, Phục vụ, Thu ngân, Kế toán, Quản lý)
- Audit logs mọi hoạt động

---

## Database Schema

### `users` - Người dùng

| Column        | Type             | Mô tả               |
| ------------- | ---------------- | ------------------- |
| id            | UUID/PK          |                     |
| email         | varchar          | Email đăng nhập     |
| password_hash | varchar          | Mật khẩu (bcrypt)   |
| full_name     | varchar          | Họ tên              |
| phone         | varchar          | SĐT                 |
| avatar_url    | varchar          | Ảnh đại diện        |
| department_id | FK → departments | Thuộc bộ phận nào   |
| is_active     | boolean          | Còn hoạt động không |
| last_login_at | timestamp        |                     |
| created_at    | timestamp        |                     |

### `departments` - Bộ phận

| Column      | Type    | Mô tả                                                          |
| ----------- | ------- | -------------------------------------------------------------- |
| id          | UUID/PK |                                                                |
| name        | varchar | Tên bộ phận                                                    |
| code        | varchar | KITCHEN, BAR, WAREHOUSE, MANAGER, CASHIER, SERVICE, ACCOUNTANT |
| description | text    |                                                                |

### `roles` - Vai trò

| Column      | Type    | Mô tả                                   |
| ----------- | ------- | --------------------------------------- |
| id          | UUID/PK |                                         |
| name        | varchar | Admin, Warehouse Staff, Chef, Waiter... |
| code        | varchar | Mã role                                 |
| description | text    |                                         |

### `role_permissions` - Quyền của từng role

| Column   | Type       | Mô tả                                  |
| -------- | ---------- | -------------------------------------- |
| id       | UUID/PK    |                                        |
| role_id  | FK → roles |                                        |
| resource | varchar    | ingredients, import_orders, recipes... |
| action   | varchar    | create, read, update, delete, approve  |

### `user_roles` - Gán role cho user

| Column  | Type       | Mô tả |
| ------- | ---------- | ----- |
| user_id | FK → users |       |
| role_id | FK → roles |       |

### `ingredients` - Nguyên liệu

| Column        | Type      | Mô tả                            |
| ------------- | --------- | -------------------------------- |
| id            | UUID/PK   |                                  |
| name          | varchar   | Tên nguyên liệu                  |
| unit          | varchar   | Đơn vị (kg, lít, gram, cái...)   |
| min_stock     | decimal   | Mức tồn kho tối thiểu            |
| current_stock | decimal   | Tồn kho hiện tại                 |
| cost_per_unit | decimal   | Giá TB / đơn vị                  |
| category      | varchar   | Phân loại (Thịt, Rau, Gia vị...) |
| created_at    | timestamp |                                  |

### `suppliers` - Nhà cung cấp

| Column  | Type    | Mô tả   |
| ------- | ------- | ------- |
| id      | UUID/PK |         |
| name    | varchar | Tên NCC |
| phone   | varchar | SĐT     |
| address | text    | Địa chỉ |
| note    | text    |         |

### `import_orders` - Phiếu nhập kho

| Column       | Type           | Mô tả                                      |
| ------------ | -------------- | ------------------------------------------ |
| id           | UUID/PK        |                                            |
| code         | varchar        | Mã phiếu (PN-20260625-001)                 |
| supplier_id  | FK → suppliers |                                            |
| total_amount | decimal        | Tổng tiền                                  |
| status       | enum           | PENDING / COMPLETED / CANCELLED / REJECTED |
| approved_by  | FK → users     | Người duyệt                                |
| note         | text           |                                            |
| created_by   | FK → users     |                                            |
| created_at   | timestamp      |                                            |

### `import_order_items` - Chi tiết phiếu nhập

| Column          | Type               | Mô tả         |
| --------------- | ------------------ | ------------- |
| id              | UUID/PK            |               |
| import_order_id | FK → import_orders |               |
| ingredient_id   | FK → ingredients   |               |
| quantity        | decimal            | Số lượng nhập |
| unit_price      | decimal            | Đơn giá       |
| total_price     | decimal            | Thành tiền    |
| expiry_date     | date               | Hạn sử dụng   |

### `stock_transactions` - Lịch sử xuất nhập kho

| Column        | Type             | Mô tả                                                       |
| ------------- | ---------------- | ----------------------------------------------------------- |
| id            | UUID/PK          |                                                             |
| ingredient_id | FK → ingredients |                                                             |
| type          | enum             | IMPORT / EXPORT / ADJUSTMENT / ORDER_DEDUCT / ORDER_RESTORE |
| quantity      | decimal          | Số lượng (+nhập, -xuất)                                     |
| unit_price    | decimal          | Đơn giá                                                     |
| total_price   | decimal          | Thành tiền                                                  |
| reference_id  | varchar          | Mã phiếu nhập / mã order                                    |
| note          | text             |                                                             |
| created_by    | FK → users       |                                                             |
| created_at    | timestamp        |                                                             |

### `recipes` - Công thức món ăn

| Column       | Type            | Mô tả               |
| ------------ | --------------- | ------------------- |
| id           | UUID/PK         |                     |
| menu_item_id | FK → menu_items | Liên kết với món ăn |
| name         | varchar         | Tên công thức       |
| serving_size | int             | Cho bao nhiêu phần  |

### `recipe_ingredients` - Nguyên liệu trong công thức

| Column        | Type             | Mô tả                   |
| ------------- | ---------------- | ----------------------- |
| id            | UUID/PK          |                         |
| recipe_id     | FK → recipes     |                         |
| ingredient_id | FK → ingredients |                         |
| quantity      | decimal          | Số lượng cần cho 1 phần |
| unit          | varchar          | Đơn vị                  |
| note          | text             |                         |

### `audit_logs` - Nhật ký hoạt động

| Column      | Type       | Mô tả                                             |
| ----------- | ---------- | ------------------------------------------------- |
| id          | UUID/PK    |                                                   |
| user_id     | FK → users | Ai thực hiện                                      |
| action      | varchar    | CREATE, UPDATE, DELETE, APPROVE, CANCEL, LOGIN... |
| resource    | varchar    | Bảng/module bị tác động                           |
| resource_id | varchar    | ID bản ghi bị tác động                            |
| old_values  | jsonb      | Giá trị cũ                                        |
| new_values  | jsonb      | Giá trị mới                                       |
| ip_address  | varchar    | IP người dùng                                     |
| user_agent  | varchar    | Thiết bị/trình duyệt                              |
| metadata    | jsonb      | Data bổ sung                                      |
| created_at  | timestamp  |                                                   |

---

## Phân Quyền (RBAC)

### Bộ phận

| Code       | Tên      | Vai trò chính                  |
| ---------- | -------- | ------------------------------ |
| WAREHOUSE  | Kho      | Nhập/xuất kho                  |
| KITCHEN    | Bếp      | Xem tồn kho, quản lý công thức |
| BAR        | Quầy bar | Xem tồn kho bar                |
| SERVICE    | Phục vụ  | Tạo order                      |
| CASHIER    | Thu ngân | Thanh toán                     |
| MANAGER    | Quản lý  | Full quyền                     |
| ACCOUNTANT | Kế toán  | Xem báo cáo, chi phí           |

### Ma trận quyền

| Resource      | Manager      | Warehouse   | Kitchen/Bar | Service | Cashier | Accountant |
| ------------- | ------------ | ----------- | ----------- | ------- | ------- | ---------- |
| Ingredients   | CRUD         | CRUD        | Read        | -       | -       | Read       |
| Import Orders | CRUD+Approve | Create,Read | -           | -       | -       | Read       |
| Stock Export  | CRUD+Approve | Create,Read | Request     | -       | -       | Read       |
| Recipes       | CRUD         | Read        | CRUD        | Read    | -       | Read       |
| Orders        | CRUD         | -           | Read        | Create  | Read    | Read       |
| Suppliers     | CRUD         | Read        | -           | -       | -       | Read       |
| Reports       | Full         | Stock       | -           | -       | -       | Full       |
| Users/Roles   | CRUD         | -           | -           | -       | -       | -          |
| Audit Logs    | Read         | -           | -           | -       | -       | Read       |

---

## Luồng Hoạt Động

### Flow 1: Nhập Kho (có phê duyệt)

```
Warehouse Staff tạo phiếu nhập → status: PENDING
  → Manager approve → status: COMPLETED → cập nhật stock → ghi audit log
  → Hoặc Manager reject → status: REJECTED → ghi audit log
```

### Flow 2: Xuất Kho Thủ Công

```
Warehouse Staff tạo phiếu xuất (hao hụt, hỏng, trả NCC)
  → Trừ stock → ghi stock_transaction → ghi audit log
```

### Flow 3: Trừ Kho Tự Động Khi Order

```
Order được tạo → với mỗi món:
  → Lấy recipe → với mỗi recipe_ingredient:
    → Trừ ingredients.current_stock (quantity × số lượng order)
    → Ghi stock_transaction (type = ORDER_DEDUCT)
    → Ghi audit log
  → Nếu current_stock <= min_stock → cảnh báo
```

### Flow 4: Hoàn Kho Khi Huỷ Order

```
Order bị huỷ → với mỗi món:
  → Cộng lại stock
  → Ghi stock_transaction (type = ORDER_RESTORE)
  → Ghi audit log
```

---

## Audit Log Events

| Event                           | Mô tả                   |
| ------------------------------- | ----------------------- |
| USER_LOGIN                      | Đăng nhập               |
| USER_LOGOUT                     | Đăng xuất               |
| USER_CREATE/UPDATE/DEACTIVATE   | Quản lý user            |
| ROLE_ASSIGN/REVOKE              | Gán/gỡ quyền            |
| INGREDIENT_CREATE/UPDATE/DELETE | Thao tác nguyên liệu    |
| IMPORT_ORDER_CREATE             | Tạo phiếu nhập          |
| IMPORT_ORDER_APPROVE            | Duyệt phiếu nhập        |
| IMPORT_ORDER_REJECT             | Từ chối phiếu           |
| IMPORT_ORDER_CANCEL             | Huỷ phiếu               |
| STOCK_EXPORT                    | Xuất kho thủ công       |
| STOCK_DEDUCT                    | Trừ kho tự động (order) |
| STOCK_RESTORE                   | Hoàn kho (huỷ order)    |
| STOCK_ADJUSTMENT                | Kiểm kê điều chỉnh      |
| RECIPE_CREATE/UPDATE/DELETE     | Thao tác công thức      |
| REPORT_EXPORT                   | Xuất báo cáo            |

---

## API Endpoints

### Auth

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `PUT /auth/change-password`

### Users

- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `PUT /users/:id/toggle-active`
- `PUT /users/:id/roles`

### Roles & Permissions

- `GET /roles`
- `POST /roles`
- `PUT /roles/:id/permissions`

### Departments

- `GET /departments`
- `POST /departments`

### Ingredients

- `GET /ingredients`
- `POST /ingredients`
- `PUT /ingredients/:id`
- `DELETE /ingredients/:id`
- `GET /ingredients/:id/history`

### Suppliers

- `GET /suppliers`
- `POST /suppliers`
- `PUT /suppliers/:id`

### Import Orders

- `GET /import-orders`
- `POST /import-orders`
- `PUT /import-orders/:id/approve`
- `PUT /import-orders/:id/reject`
- `PUT /import-orders/:id/cancel`

### Stock Export

- `GET /stock-exports`
- `POST /stock-exports`

### Recipes

- `GET /recipes`
- `POST /recipes`
- `PUT /recipes/:id`
- `GET /recipes/:id`

### Audit Logs

- `GET /audit-logs`
- `GET /audit-logs/resource/:resource/:id`
- `GET /audit-logs/user/:userId`

### Reports

- `GET /reports/stock-summary`
- `GET /reports/stock-movement`
- `GET /reports/low-stock`
- `GET /reports/cost-analysis`

---

## UI Screens

| Screen         | Quyền                          | Mô tả                       |
| -------------- | ------------------------------ | --------------------------- |
| Login          | All                            | Đăng nhập                   |
| Dashboard Kho  | Manager, Warehouse             | Tổng quan tồn kho, cảnh báo |
| Nguyên liệu    | Manager, Warehouse             | CRUD, filter, tồn kho       |
| Phiếu nhập kho | Manager, Warehouse             | Tạo/duyệt phiếu nhập        |
| Phiếu xuất kho | Manager, Warehouse             | Xuất thủ công               |
| Công thức      | Manager, Kitchen               | Gán nguyên liệu cho món     |
| Nhà cung cấp   | Manager, Warehouse             | CRUD suppliers              |
| Lịch sử kho    | Manager, Warehouse, Accountant | Timeline xuất nhập          |
| Quản lý Users  | Manager                        | CRUD users, gán role        |
| Quản lý Roles  | Manager                        | Config permissions          |
| Audit Logs     | Manager, Accountant            | Xem lịch sử hoạt động       |
| Báo cáo        | Manager, Accountant            | Biểu đồ, export             |

---

## Phases Triển Khai

### Phase 0: Auth & Users

- [ ] DB migrations: users, departments, roles, role_permissions, user_roles, audit_logs
- [ ] Auth: login, JWT, refresh token
- [ ] CRUD Users, Departments
- [ ] CRUD Roles + Permissions
- [ ] RBAC Guard (phân quyền)
- [ ] Audit log interceptor

### Phase 1: Warehouse Core

- [ ] CRUD Ingredients
- [ ] CRUD Suppliers
- [ ] Import Orders + Approval flow
- [ ] Stock Export (thủ công)

### Phase 2: Recipe & Auto Deduct

- [ ] CRUD Recipes
- [ ] Hook Order → auto deduct stock
- [ ] Hoàn kho khi huỷ order

### Phase 3: Reports & Alerts

- [ ] Cảnh báo tồn kho thấp
- [ ] Báo cáo tồn kho, biến động, chi phí
- [ ] Dashboard
- [ ] Export Excel/PDF

### Phase 4: Advanced

- [ ] Kiểm kê (stocktake/adjustment)
- [ ] Quản lý hạn sử dụng (FIFO)
- [ ] Đề xuất nhập hàng tự động
- [ ] Tích hợp POS

---

## Tech Stack

| Layer    | Choice                       |
| -------- | ---------------------------- |
| Backend  | NestJS + TypeScript          |
| DB       | PostgreSQL                   |
| ORM      | Prisma                       |
| Frontend | React + @dangbt/pro-ui       |
| Auth     | JWT (access + refresh token) |
| Queue    | Bull (async deduct)          |
| Cache    | Redis                        |

---

## Security

- JWT access token (15 phút) + refresh token (7 ngày)
- AuthGuard → RolesGuard → PermissionsGuard
- Audit logs: append-only, không xoá/sửa
- Password: bcrypt, min 8 ký tự
- Rate limiting login (chống brute force)
- Soft delete users (is_active = false)
