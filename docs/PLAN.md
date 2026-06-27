# Plan: Hệ Thống Quản Lý Xuất Nhập Kho Nguyên Liệu Nhà Hàng

> Tài liệu này phản ánh **trạng thái code hiện tại** (cập nhật 2026-06-26), không còn là kế hoạch thuần tuý.
> Nguồn sự thật cuối cùng vẫn là `apps/api/prisma/schema.prisma` + source code.

## Tổng Quan

Hệ thống quản lý kho nguyên liệu cho nhà hàng:

- Nhập/xuất kho nguyên liệu (có workflow phê duyệt)
- Quản lý theo lô (batch) + hạn sử dụng, cảnh báo lô sắp hết hạn
- Đồng bộ order từ KiotViet (POS) → tự động trừ kho theo công thức (recipe)
- Kiểm kê (stocktake) → điều chỉnh tồn kho
- Trả hàng nhà cung cấp + công nợ + thanh toán NCC
- Phân quyền theo vai trò (RBAC) + Audit logs mọi hoạt động
- Báo cáo tồn kho, biến động, tiêu hao, chênh lệch định mức

---

## Database Schema

> Tên cột dưới đây là tên DB (snake_case). Trong Prisma model dùng camelCase + `@map`.

### `departments` - Bộ phận

| Column      | Type       | Mô tả                                                          |
| ----------- | ---------- | -------------------------------------------------------------- |
| id          | UUID/PK    |                                                                |
| name        | varchar    | Tên bộ phận                                                    |
| code        | varchar/UK | MANAGER, WAREHOUSE, KITCHEN, BAR, SERVICE, CASHIER, ACCOUNTANT |
| description | text?      |                                                                |
| created_at  | timestamp  |                                                                |

### `users` - Người dùng

| Column        | Type              | Mô tả                              |
| ------------- | ----------------- | ---------------------------------- |
| id            | UUID/PK           |                                    |
| email         | varchar/UK        | Email đăng nhập                    |
| password_hash | varchar           | Mật khẩu (bcrypt)                  |
| full_name     | varchar           | Họ tên                             |
| phone         | varchar?          | SĐT                                |
| avatar_url    | varchar?          | Ảnh đại diện                       |
| department_id | FK? → departments | Thuộc bộ phận nào                  |
| is_active     | boolean           | Còn hoạt động không (default true) |
| last_login_at | timestamp?        |                                    |
| created_at    | timestamp         |                                    |

### `roles` / `role_permissions` / `user_roles` - RBAC

`roles`: id, name, code (unique), description?

`role_permissions`: id, role_id (FK, cascade), resource, action — unique theo (role_id, resource, action).

`user_roles`: user_id + role_id (composite PK, cascade). Gán nhiều role cho 1 user.

### `ingredients` - Nguyên liệu

| Column        | Type          | Mô tả                            |
| ------------- | ------------- | -------------------------------- |
| id            | UUID/PK       |                                  |
| name          | varchar/UK    | Tên nguyên liệu (unique)         |
| unit          | varchar       | Đơn vị (kg, lít, gram, cái...)   |
| min_stock     | decimal(10,3) | Mức tồn kho tối thiểu            |
| current_stock | decimal(10,3) | Tồn kho hiện tại                 |
| cost_per_unit | decimal(12,2) | Giá TB / đơn vị                  |
| category      | varchar       | Phân loại (Thịt, Rau, Gia vị...) |
| created_at    | timestamp     |                                  |

### `suppliers` - Nhà cung cấp

| Column     | Type          | Mô tả                |
| ---------- | ------------- | -------------------- |
| id         | UUID/PK       |                      |
| name       | varchar       | Tên NCC              |
| phone      | varchar?      | SĐT                  |
| address    | text?         | Địa chỉ              |
| note       | text?         |                      |
| total_debt | decimal(14,2) | Công nợ phải trả NCC |

### `import_orders` - Phiếu nhập kho

| Column       | Type           | Mô tả                                                                              |
| ------------ | -------------- | ---------------------------------------------------------------------------------- |
| id           | UUID/PK        |                                                                                    |
| code         | varchar/UK     | Mã phiếu (PN-...)                                                                  |
| supplier_id  | FK → suppliers |                                                                                    |
| total_amount | decimal(14,2)  | Tổng tiền                                                                          |
| status       | string         | PENDING / COMPLETED / REJECTED (default PENDING)                                   |
| paid         | boolean        | Đã thanh toán ngay chưa (default false). Nếu chưa → cộng vào công nợ NCC khi duyệt |
| note         | text?          |                                                                                    |
| created_by   | FK → users     |                                                                                    |
| approved_by  | FK? → users    | Người duyệt                                                                        |
| created_at   | timestamp      |                                                                                    |

### `import_order_items` - Chi tiết phiếu nhập

id, import_order_id (FK, cascade), ingredient_id (FK), quantity decimal(10,3), unit_price decimal(12,2), total_price decimal(14,2), expiry_date date?. Quan hệ 1-1 với `ingredient_batches` (mỗi dòng nhập tạo 1 lô).

### `ingredient_batches` - Lô nguyên liệu (FIFO + HSD)

| Column               | Type                              | Mô tả                                |
| -------------------- | --------------------------------- | ------------------------------------ |
| id                   | UUID/PK                           |                                      |
| ingredient_id        | FK → ingredients                  |                                      |
| import_order_item_id | FK? → import_order_items (unique) | Lô sinh ra từ dòng nhập nào          |
| batch_code           | varchar                           | Mã lô (`{order.code}-{itemId[0:4]}`) |
| quantity             | decimal(10,3)                     | Số lượng nhập của lô                 |
| cost_per_unit        | decimal(12,2)                     | Giá vốn lô                           |
| expiry_date          | date?                             | Hạn sử dụng                          |
| received_date        | timestamp                         | Ngày nhận                            |
| status               | string                            | ACTIVE / DEPLETED (default ACTIVE)   |
| note                 | text?                             |                                      |
| created_at           | timestamp                         |                                      |

### `stock_transactions` - Lịch sử xuất nhập kho

| Column        | Type             | Mô tả                                                      |
| ------------- | ---------------- | ---------------------------------------------------------- |
| id            | UUID/PK          |                                                            |
| ingredient_id | FK → ingredients |                                                            |
| type          | string           | IMPORT / EXPORT / ORDER_DEDUCT / RETURN / STOCKTAKE_ADJUST |
| quantity      | decimal(10,3)    | Số lượng (+nhập, -xuất)                                    |
| unit_price    | decimal(12,2)?   | Đơn giá                                                    |
| total_price   | decimal(14,2)?   | Thành tiền                                                 |
| reference_id  | varchar?         | Mã phiếu nhập / order / phiên kiểm kê...                   |
| note          | text?            |                                                            |
| created_by    | FK → users       |                                                            |
| created_at    | timestamp        |                                                            |

### `menu_items` - Món ăn

id, name, price decimal(12,2), category, is_active (default true). Quan hệ 1-1 với `recipes`, 1-N với `kiotviet_order_items` (map theo tên sản phẩm).

### `recipes` / `recipe_ingredients` - Công thức món ăn

`recipes`: id, menu_item_id (FK, unique), name, serving_size (int, default 1).

`recipe_ingredients`: id, recipe_id (FK, cascade), ingredient_id (FK), quantity decimal(10,3), unit, note?.

### `kiotviet_orders` / `kiotviet_order_items` - Đồng bộ POS

`kiotviet_orders`: id, kiotviet_id (unique), code, customer_name?, total_amount, status (default SYNCED), deducted (bool — đã trừ kho chưa), order_date, synced_at.

`kiotviet_order_items`: id, order_id (FK, cascade), product_name, menu_item_id? (map sang món), quantity int, price.

### `stocktake_sessions` / `stocktake_items` - Kiểm kê

`stocktake_sessions`: id, code (unique), status (DRAFT / COMPLETED, default DRAFT), note?, created_by, completed_at?, created_at.

`stocktake_items`: id, session_id (FK, cascade), ingredient_id, system_qty, actual_qty, difference, note?. Khi complete → `current_stock = actual_qty` + ghi `STOCKTAKE_ADJUST`.

### `purchase_returns` / `purchase_return_items` - Trả hàng NCC

`purchase_returns`: id, code (unique), supplier_id, total_amount, reason, note?, created_by, created_at.

`purchase_return_items`: id, return_id (FK, cascade), ingredient_id, quantity, unit_price, total_price. Khi tạo → trừ kho (`RETURN`) + giảm công nợ NCC.

### `supplier_payments` - Thanh toán công nợ NCC

id, supplier_id, amount decimal(14,2), method (CASH / TRANSFER), note?, created_by, created_at. Khi tạo → giảm `supplier.total_debt`.

### `audit_logs` - Nhật ký hoạt động

id, user_id?, action, resource, resource_id?, old_values jsonb?, new_values jsonb?, ip_address?, user_agent?, metadata jsonb?, created_at. Append-only.

---

## Phân Quyền (RBAC)

### Bộ phận (seed)

| Code       | Tên      |
| ---------- | -------- |
| MANAGER    | Quản lý  |
| WAREHOUSE  | Kho      |
| KITCHEN    | Bếp      |
| BAR        | Bar      |
| SERVICE    | Phục vụ  |
| CASHIER    | Thu ngân |
| ACCOUNTANT | Kế toán  |

### Resources & Actions (theo `@RequirePermissions` trong code)

| Resource          | Actions                               |
| ----------------- | ------------------------------------- |
| ingredients       | create, read, update, delete          |
| suppliers         | create, read, update, delete          |
| import_orders     | create, read, approve                 |
| stock_exports     | create, read                          |
| recipes           | create, read, update                  |
| users             | read (+ create/update/toggle qua JWT) |
| audit_logs        | read                                  |
| kiotviet          | read, sync, deduct                    |
| stocktake         | read, create, complete                |
| purchase_returns  | read, create                          |
| supplier_payments | read, create                          |

> Các endpoint `departments`, `roles`, `menu-items` (controller `common`) chỉ yêu cầu JWT, chưa gắn permission guard riêng.

### Roles seed sẵn

| Role            | code            | Quyền                                                                                         |
| --------------- | --------------- | --------------------------------------------------------------------------------------------- |
| Admin           | admin           | Toàn bộ permission (gồm cả kiotviet, stocktake, purchase_returns, supplier_payments)          |
| Warehouse Staff | warehouse_staff | ingredients (CRU), import_orders (create/read), stock_exports (create/read), suppliers (read) |
| Kitchen Staff   | kitchen_staff   | ingredients (read), recipes (CRU)                                                             |

User seed: `admin@wms.vn`, `kho@wms.vn`, `bep@wms.vn` — mật khẩu `123456`.

---

## Luồng Hoạt Động

### Flow 1: Nhập Kho (có phê duyệt)

```
Warehouse Staff tạo phiếu nhập → status: PENDING
  → Manager approve → status: COMPLETED
      → với mỗi item: tăng current_stock, ghi stock_transaction (IMPORT), tạo ingredient_batch
      → nếu paid = false: supplier.total_debt += total_amount
      → ghi audit log
  → Hoặc Manager reject → status: REJECTED → ghi audit log
```

### Flow 2: Xuất Kho Thủ Công

```
Tạo phiếu xuất (hao hụt, hỏng...) → trừ current_stock → ghi stock_transaction (EXPORT) → audit log
```

### Flow 3: Trừ Kho Tự Động Từ Order KiotViet

```
Sync order từ KiotViet (POST /kiotviet/sync hoặc /sync-api) → lưu kiotviet_orders (deducted = false)
  → POST /kiotviet/orders/:id/deduct → với mỗi item map sang menu_item → lấy recipe:
      → với mỗi recipe_ingredient: trừ current_stock (quantity × số lượng order)
      → ghi stock_transaction (ORDER_DEDUCT)
      → đánh dấu order.deducted = true
```

### Flow 4: Kiểm Kê (Stocktake)

```
Tạo phiên (DRAFT) → snapshot system_qty từ current_stock của mọi nguyên liệu
  → nhập actual_qty cho từng dòng (PUT :id/items), tính difference
  → complete → current_stock = actual_qty, ghi stock_transaction (STOCKTAKE_ADJUST), status = COMPLETED
```

### Flow 5: Trả Hàng NCC + Công Nợ

```
Tạo phiếu trả hàng → với mỗi item: trừ current_stock, ghi stock_transaction (RETURN)
  → supplier.total_debt -= total_amount
Thanh toán NCC (CASH/TRANSFER) → supplier.total_debt -= amount
```

---

## API Endpoints (thực tế)

Prefix: tất cả route đều có global prefix `/api/v1` (xem main.ts). Bảo vệ bằng `JwtAuthGuard` + `PermissionsGuard` trừ `auth/login` và `health`.

### Auth & Health

- `POST /auth/login` — trả access token + thông tin user/roles/permissions
- `GET /health`

> Chưa implement: refresh token, logout, change-password.

### Users

- `GET /users` (`users:read`)
- `POST /users`
- `PUT /users/:id`
- `PUT /users/:id/toggle-active`

### Common (Departments / Roles / Menu)

- `GET /departments`
- `GET /roles`
- `POST /roles`
- `PUT /roles/:id/permissions`
- `GET /menu-items`

### Ingredients

- `GET /ingredients` (`ingredients:read`)
- `POST /ingredients` (`ingredients:create`)
- `PUT /ingredients/:id` (`ingredients:update`)
- `DELETE /ingredients/:id` (`ingredients:delete`)

### Batches

- `GET /batches` (`ingredients:read`)
- `GET /reports/expiring` (`ingredients:read`) — lô sắp hết hạn

### Suppliers

- `GET /suppliers` (`suppliers:read`)
- `POST /suppliers` (`suppliers:create`)
- `PUT /suppliers/:id` (`suppliers:update`)
- `DELETE /suppliers/:id` (`suppliers:delete`)

### Import Orders

- `GET /import-orders` (`import_orders:read`)
- `POST /import-orders` (`import_orders:create`)
- `PUT /import-orders/:id/approve` (`import_orders:approve`)
- `PUT /import-orders/:id/reject` (`import_orders:approve`)

### Stock Exports

- `GET /stock-exports` (`stock_exports:read`)
- `POST /stock-exports` (`stock_exports:create`)

### Recipes

- `GET /recipes` (`recipes:read`)
- `POST /recipes` (`recipes:create`)
- `PUT /recipes/:id` (`recipes:update`)

### KiotViet

- `GET /kiotviet/orders` (`kiotviet:read`)
- `POST /kiotviet/sync` (`kiotviet:sync`)
- `POST /kiotviet/sync-api` (`kiotviet:sync`)
- `POST /kiotviet/orders/:id/deduct` (`kiotviet:deduct`)

### Stocktake

- `GET /stocktake` (`stocktake:read`)
- `POST /stocktake` (`stocktake:create`)
- `GET /stocktake/:id` (`stocktake:read`)
- `PUT /stocktake/:id/items` (`stocktake:create`)
- `POST /stocktake/:id/complete` (`stocktake:complete`)

### Purchase Returns

- `GET /purchase-returns` (`purchase_returns:read`)
- `POST /purchase-returns` (`purchase_returns:create`)

### Supplier Payments

- `GET /supplier-payments` (`supplier_payments:read`)
- `POST /supplier-payments` (`supplier_payments:create`)

### Audit Logs

- `GET /audit-logs` (`audit_logs:read`)

### Reports

- `GET /reports/stock-summary`
- `GET /reports/stock-movement`
- `GET /reports/ingredient-usage`
- `GET /reports/consumption-variance`

---

## UI Screens (web — TanStack Router)

| Route                          | Màn hình               |
| ------------------------------ | ---------------------- |
| `/login`                       | Đăng nhập              |
| `/dashboard`                   | Dashboard tồn kho      |
| `/ingredients`                 | Nguyên liệu (CRUD)     |
| `/suppliers`                   | Nhà cung cấp + công nợ |
| `/import-orders`               | Phiếu nhập + duyệt     |
| `/stock-exports`               | Phiếu xuất thủ công    |
| `/recipes`                     | Công thức món          |
| `/kiotviet`                    | Đồng bộ order KiotViet |
| `/stocktake`, `/stocktake/:id` | Kiểm kê                |
| `/purchase-returns`            | Trả hàng NCC           |
| `/users`                       | Quản lý users          |
| `/roles`                       | Quản lý roles/quyền    |
| `/audit-logs`                  | Nhật ký hoạt động      |
| `/reports`                     | Báo cáo tổng hợp       |
| `/ingredient-usage`            | Báo cáo tiêu hao NL    |
| `/consumption-variance`        | Chênh lệch định mức    |

---

## Mở Rộng: Bán Thành Phẩm (BTP) & Gom Nhóm Nguyên Liệu — ĐỀ XUẤT (chưa code)

> Giải quyết bài toán **chế biến nội bộ**: nhiều nguyên liệu là _bán thành phẩm_ làm từ nguyên liệu sống.
> Ví dụ: ba rọi sống → ba rọi chín / ba rọi nướng; thịt bò sống → bò chín; vịt sống → vịt chín…
> Khi báo cáo tồn chỉ cần xem **tổng theo nhóm** (vd "ba rọi" = sống + chín + nướng).
> **Thiết kế tổng quát, cấu hình bằng dữ liệu — KHÔNG hardcode từng món.**

### Nguyên tắc: tồn kho 2 lớp

```
NCC ──nhập──► [NL sống] ──(phiếu chế biến)──► [BTP: chín/nướng] ──(order)──► trừ kho
```

- Recipe của món trỏ tới **BTP** (vd ba rọi nướng). Order → trừ BTP (`ORDER_DEDUCT`).
- NL sống **chỉ giảm khi chế biến**, không bị trừ trực tiếp bởi order.
- Lý do: biết chính xác đang còn bao nhiêu đồ đã sơ chế sẵn; nếu trừ thẳng sống thì BTP không bao giờ giảm (sai).

### Thay đổi schema

#### `ingredient_groups` - Nhóm nguyên liệu (gom tồn)

| Column    | Type           | Mô tả                                                                                    |
| --------- | -------------- | ---------------------------------------------------------------------------------------- |
| id        | UUID/PK        |                                                                                          |
| name      | varchar/UK     | Tên nhóm (vd "Ba rọi", "Thịt bò", "Vịt")                                                 |
| base_unit | varchar        | **Đơn vị gốc của nhóm để cộng tồn**, quy ước theo NL gốc (vd "kg" = kg sống tương đương) |
| min_stock | decimal(10,3)? | Ngưỡng cảnh báo cấp nhóm theo base_unit (tuỳ chọn)                                       |
| note      | text?          |                                                                                          |

> Member trong nhóm **không cần cùng đơn vị tồn**: mỗi NL khai `base_factor` để quy về `base_unit` của nhóm (xem UoM bên dưới).

#### `ingredients` - thêm 4 cột

| Column               | Type                     | Mô tả                                                                                                                                                                         |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| group_id             | FK? → ingredient_groups  | Nhóm để gom tồn (vd cả 3 ba rọi cùng group)                                                                                                                                   |
| source_ingredient_id | FK? → ingredients (self) | NL nguồn nếu đây là BTP (vd ba rọi nướng ← ba rọi sống). NULL = NL mua ngoài                                                                                                  |
| yield_ratio          | decimal(6,4)?            | Định mức quy đổi mặc định = output/source (vd 0.7 = 1kg sống ra 0.7kg nướng)                                                                                                  |
| base_factor          | decimal(12,6)?           | Quy đổi **1 đơn vị tồn của NL → base_unit của nhóm** (theo NL gốc tương đương). VD ba rọi chín: 1 phần = 0.22 kg **sống tương đương** ⇒ base_factor = 0.22. NL sống (kg): = 1 |

#### `ingredient_units` - Đơn vị tính phụ / đóng gói (UoM)

> Cho phép nhập/xuất theo **đơn vị đóng gói** khác đơn vị tồn. VD: tồn theo "chai", nhập theo "thùng".

| Column         | Type             | Mô tả                                                          |
| -------------- | ---------------- | -------------------------------------------------------------- |
| id             | UUID/PK          |                                                                |
| ingredient_id  | FK → ingredients |                                                                |
| unit_name      | varchar          | Tên ĐVT phụ (vd "thùng", "lốc")                                |
| factor         | decimal(12,4)    | 1 [unit_name] = factor [đơn vị tồn]. VD 1 thùng = 24 chai ⇒ 24 |
| is_default_buy | boolean          | ĐVT mặc định khi nhập (tuỳ chọn)                               |

- Đơn vị tồn gốc của NL vẫn là `ingredients.unit` (vd "chai", "phần", "kg").
- Khi nhập theo "thùng", user chọn ĐVT = thùng + nhập số lượng; **factor có thể cho sửa ngay tại phiếu nhập** (vì thùng 12/24 chai khác nhau) → số tồn cộng vào = quantity × factor (ra "chai").

#### `processing_orders` - Phiếu chế biến

| Column               | Type             | Mô tả                                            |
| -------------------- | ---------------- | ------------------------------------------------ |
| id                   | UUID/PK          |                                                  |
| code                 | varchar/UK       | Mã phiếu (CB-YYYYMMDD-XXX)                       |
| source_ingredient_id | FK → ingredients | NL sống dùng                                     |
| source_qty           | decimal(10,3)    | Lượng sống tiêu hao                              |
| output_ingredient_id | FK → ingredients | BTP tạo ra                                       |
| expected_qty         | decimal(10,3)    | Lượng dự kiến = source_qty × yield_ratio (gợi ý) |
| output_qty           | decimal(10,3)    | **Lượng thực thu** (người làm nhập, có hao hụt)  |
| status               | string           | DRAFT / COMPLETED                                |
| note                 | text?            |                                                  |
| created_by           | FK → users       |                                                  |
| completed_at         | timestamp?       |                                                  |
| created_at           | timestamp        |                                                  |

#### `stock_transactions.type` - thêm 2 giá trị

`PROCESS_OUT` (trừ NL sống khi chế biến), `PROCESS_IN` (cộng BTP).

### Luồng chế biến (khi complete phiếu)

```
1. Trừ source: current_stock(source) -= source_qty   → ghi PROCESS_OUT
2. Cộng output: current_stock(output) += output_qty  → ghi PROCESS_IN
3. Chuyển giá vốn: cost_per_unit(output) = (source_qty × cost_per_unit(source)) / output_qty
   → hao hụt tự đẩy giá vốn/đơn vị BTP lên (đúng kế toán)
4. hao_hut = source_qty − (output_qty / yield_ratio)   # thông tin, để báo cáo
5. Ghi audit log
```

### Báo cáo tồn theo nhóm (quy đổi về base_unit)

> ⚠️ **Bắt buộc:** báo cáo hàng tồn phải **tự động quy đổi ĐVT phần → kg** (theo `base_factor`) — không hiển thị tồn thô theo "phần". VD ba rọi chín 10 phần → báo cáo hiện **2.2 kg**.

- `stock-summary` bổ sung rollup: mỗi nhóm hiện **tổng tồn theo base_unit** = `Σ (member.current_stock × member.base_factor)` + breakdown từng trạng thái (kèm đơn vị tồn gốc + giá trị đã quy đổi).
- Cảnh báo tồn thấp: theo từng NL như hiện tại, **+ tuỳ chọn** theo `ingredient_groups.min_stock` (so với tổng đã quy đổi).
- Báo cáo mới (tuỳ chọn): `processing-loss` — hao hụt chế biến theo NL / theo kỳ.

**Ví dụ nhóm "Ba rọi" (base_unit = kg):**

| NL            | Đơn vị tồn | current_stock | base_factor | Quy ra kg   |
| ------------- | ---------- | ------------- | ----------- | ----------- |
| Ba rọi sống   | kg         | 8             | 1           | 8.0         |
| Ba rọi chín   | phần       | 10            | 0.22        | 2.2         |
| Ba rọi nướng  | phần       | 6             | 0.25        | 1.5         |
| **Tổng nhóm** |            |               |             | **11.7 kg** |

### Endpoint & quyền (dự kiến)

- `GET/POST /ingredient-groups`, `PUT /ingredient-groups/:id` — quyền `ingredients:*` hoặc resource mới `ingredient_groups`.
- `GET /processing`, `POST /processing`, `POST /processing/:id/complete` — resource mới **`processing`** (read / create / complete).
- Báo cáo: `GET /reports/stock-summary` (thêm nhóm), `GET /reports/processing-loss`.

### UI (dự kiến)

- Form nguyên liệu: thêm chọn **Nhóm** + **đơn vị tồn**; nếu là BTP chọn **NL nguồn** + **yield_ratio**; khai **base_factor** (quy về base_unit của nhóm); quản lý **ĐVT phụ** (thùng/lốc + factor).
- Form phiếu nhập: cho chọn ĐVT nhập (chai/thùng…), nhập số lượng + factor (nếu thùng) → hiển thị số tồn quy đổi.
- Màn **Chế biến** (`/processing`): tạo phiếu (chọn nguồn + lượng dùng → gợi ý lượng thu → sửa thực thu) → complete.
- Báo cáo tồn: hàng nhóm hiện **tổng theo base_unit**, bung ra xem từng NL + đơn vị tồn gốc.

### Ràng buộc & lưu ý

- Gom tồn dùng `base_factor` quy về `base_unit` của nhóm → member **không cần cùng đơn vị**.
- ĐVT 2 tầng: (1) **đóng gói↔tồn** qua `ingredient_units` (thùng→chai) khi nhập/xuất; (2) **tồn↔nhóm** qua `base_factor` khi gom báo cáo.
- BTP có thể nhiều cấp (sống → luộc → chiên), `source_ingredient_id` cho phép chuỗi; nên giới hạn độ sâu để dễ kiểm soát.
- `recipe_ingredients` không đổi cấu trúc — chỉ cần trỏ tới BTP thay vì NL sống.

**Lỗ hổng cần chốt trước khi code (chưa giải quyết):**

- **HSD cho BTP:** khi `PROCESS_IN` có tạo `ingredient_batch` cho BTP không (đồ nướng/luộc chỉ để được vài ngày)? Hiện batch chỉ sinh từ phiếu nhập.
- **1 mẻ → nhiều BTP:** `processing_orders` hiện 1 source → 1 output. Nếu 1 mẻ luộc ra cả "chín" + "nước luộc" thì cần bảng con `processing_outputs`.
- **Truy vết:** `stock_transactions.reference_id` của PROCESS_OUT/PROCESS_IN nên trỏ về `processing_orders.code`.

---

## Tech Stack (thực tế)

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Monorepo   | Turborepo + npm workspaces (`apps/*`, `packages/*`)           |
| Backend    | NestJS + TypeScript                                           |
| DB / ORM   | PostgreSQL + Prisma                                           |
| Auth       | JWT (access token) qua `@nestjs/jwt` + passport-jwt, bcryptjs |
| Validation | class-validator / class-transformer                           |
| Frontend   | React + TanStack Router + TanStack Query + Zustand            |
| Forms/UI   | react-hook-form, recharts, @dangbt/pro-ui, Tailwind CSS v4    |
| Unit test  | Jest (api), Vitest (web)                                      |
| E2E        | Playwright (`apps/e2e`)                                       |

> Lưu ý: Redis / Bull Queue **chưa được tích hợp** — trừ kho từ order KiotViet hiện chạy đồng bộ qua endpoint `deduct`, không qua message queue. Refresh token cũng chưa làm.

---

## Trạng Thái Phases

### Phase 0: Auth & Users — ✅ phần lớn

- [x] DB migrations: users, departments, roles, role_permissions, user_roles, audit_logs
- [x] Auth: login + JWT
- [x] CRUD Users; Departments/Roles (read + roles config permissions)
- [x] RBAC Guard (JwtAuthGuard + PermissionsGuard)
- [x] Audit log
- [ ] Refresh token / logout / change-password

### Phase 1: Warehouse Core — ✅

- [x] CRUD Ingredients
- [x] CRUD Suppliers (có cả delete)
- [x] Import Orders + Approval flow (approve/reject)
- [x] Stock Export (thủ công)
- [x] Ingredient Batches (FIFO + HSD)

### Phase 2: Recipe & Auto Deduct — ✅ (qua KiotViet)

- [x] CRUD Recipes (chưa có delete)
- [x] Menu items + recipe
- [x] Đồng bộ order KiotViet → auto deduct theo recipe
- [ ] Hoàn kho (ORDER_RESTORE) khi huỷ order — chưa làm

### Phase 3: Reports & Alerts — ✅ phần lớn

- [x] Dashboard
- [x] Báo cáo: stock-summary, stock-movement, ingredient-usage, consumption-variance
- [x] Cảnh báo lô sắp hết hạn (`/reports/expiring`)
- [ ] Export Excel/PDF

### Phase 4: Advanced — 🟡 đang làm

- [x] Kiểm kê (stocktake) + điều chỉnh tồn
- [x] Quản lý lô + hạn sử dụng (FIFO)
- [x] Trả hàng NCC + công nợ + thanh toán NCC
- [x] Tích hợp POS (KiotViet)
- [ ] Đề xuất nhập hàng tự động

---

## Security

- JWT access token + bcrypt (password hash). RBAC: JwtAuthGuard → PermissionsGuard.
- Audit logs append-only.
- Soft delete users (is_active = false) qua toggle-active.
- (Chưa làm) refresh token, rate limiting login.
