# Use Cases Document

## Hệ Thống Quản Lý Xuất Nhập Kho Nguyên Liệu Nhà Hàng

> Cập nhật 2026-06-26 theo code. Lưu ý trạng thái triển khai:
>
> - **UC-03c (Huỷ phiếu nhập đã duyệt):** ❌ chưa có (không có endpoint cancel).
> - **UC-06 (Trừ kho tự động):** ✅ nhưng qua **đồng bộ KiotViet + deduct thủ công**, không phải webhook Order Service.
> - **UC-07 (Hoàn kho khi huỷ order):** ❌ chưa triển khai.
> - **UC-09 (Cảnh báo tồn thấp):** 🟡 có report `/reports/expiring` + highlight tồn thấp; chưa có push notification.
> - UC mới đã code: UC-11 Kiểm kê, UC-12 Trả hàng NCC + công nợ, UC-13 Thanh toán NCC, UC-14 Lô/HSD, UC-15 Đồng bộ KiotViet (xem cuối tài liệu).

---

## UC-01: Đăng Nhập

| Mục          | Chi tiết                 |
| ------------ | ------------------------ |
| Actor        | Tất cả users             |
| Precondition | User có tài khoản active |
| Trigger      | User truy cập hệ thống   |

**Main Flow:**

1. User nhập email + password
2. Hệ thống validate credentials
3. Hệ thống trả về access token + refresh token
4. Ghi audit log (USER_LOGIN)
5. Redirect đến dashboard theo role

**Alternative Flow:**

- 2a. Sai password → hiển thị lỗi, tăng counter
- 2b. Sai 5 lần → khoá 15 phút
- 2c. Tài khoản bị deactivate → hiển thị "Tài khoản đã bị khoá"

---

## UC-02: Quản Lý Nguyên Liệu

| Mục          | Chi tiết                                              |
| ------------ | ----------------------------------------------------- |
| Actor        | Manager, Warehouse Staff                              |
| Precondition | User đã đăng nhập, có quyền ingredients:create/update |

**UC-02a: Thêm nguyên liệu**

1. User chọn "Thêm nguyên liệu"
2. Nhập: tên, đơn vị, mức tồn tối thiểu, giá, phân loại
3. Hệ thống validate (tên không trùng)
4. Lưu ingredient với current_stock = 0
5. Ghi audit log

**UC-02b: Sửa nguyên liệu**

1. User chọn nguyên liệu → Edit
2. Sửa thông tin
3. Hệ thống lưu, ghi audit log (old_values + new_values)

**UC-02c: Xoá nguyên liệu**

1. User chọn nguyên liệu → Delete
2. Hệ thống kiểm tra: không có trong recipe nào
3. Nếu có → báo lỗi "Nguyên liệu đang được sử dụng trong công thức"
4. Nếu không → soft delete, ghi audit log

---

## UC-03: Nhập Kho

| Mục          | Chi tiết                                        |
| ------------ | ----------------------------------------------- |
| Actor        | Warehouse Staff (tạo), Manager (duyệt)          |
| Precondition | Đã có nguyên liệu + nhà cung cấp trong hệ thống |

**UC-03a: Tạo phiếu nhập**

1. Warehouse Staff chọn "Tạo phiếu nhập"
2. Chọn nhà cung cấp
3. Thêm từng dòng: nguyên liệu, số lượng, đơn giá, hạn sử dụng
4. Hệ thống tính total_amount, sinh mã phiếu
5. Lưu với status = PENDING
6. Ghi audit log
7. Thông báo cho Manager

**UC-03b: Duyệt phiếu nhập**

1. Manager xem danh sách phiếu PENDING
2. Xem chi tiết phiếu
3. Chọn Approve:
   - Status → COMPLETED
   - Cộng stock từng ingredient
   - Ghi stock_transactions
   - Ghi audit log
4. Hoặc chọn Reject:
   - Nhập lý do
   - Status → REJECTED
   - Ghi audit log

**UC-03c: Huỷ phiếu đã duyệt**

1. Manager chọn phiếu COMPLETED → Cancel
2. Confirm lý do huỷ
3. Trừ lại stock
4. Ghi stock_transactions đảo
5. Status → CANCELLED
6. Ghi audit log

---

## UC-04: Xuất Kho Thủ Công

| Mục          | Chi tiết                 |
| ------------ | ------------------------ |
| Actor        | Warehouse Staff          |
| Precondition | Nguyên liệu có trong kho |

**Main Flow:**

1. User chọn "Xuất kho"
2. Chọn nguyên liệu, số lượng
3. Chọn lý do: Hao hụt / Hỏng / Hết hạn / Trả NCC / Nội bộ
4. Nhập ghi chú
5. Hệ thống kiểm tra: quantity <= current_stock
6. Trừ stock
7. Ghi stock_transactions (type = EXPORT)
8. Ghi audit log

**Alternative:**

- 5a. Số lượng xuất > tồn kho → báo lỗi

---

## UC-05: Quản Lý Công Thức

| Mục          | Chi tiết                        |
| ------------ | ------------------------------- |
| Actor        | Manager, Kitchen Staff          |
| Precondition | Đã có menu_items và ingredients |

**Main Flow:**

1. User chọn món ăn → "Tạo/Sửa công thức"
2. Thêm từng nguyên liệu + số lượng cần dùng cho 1 phần
3. Lưu recipe + recipe_ingredients
4. Ghi audit log

**Lưu ý:** Sửa công thức không ảnh hưởng retroactive đến các order đã trừ kho trước đó.

---

## UC-06: Trừ Kho Tự Động Khi Order

| Mục          | Chi tiết                                     |
| ------------ | -------------------------------------------- |
| Actor        | System (tự động), triggered by Order Service |
| Precondition | Món ăn đã có recipe                          |

**Main Flow:**

1. Order Service gửi event: order confirmed
2. WMS nhận event
3. Với mỗi order_item:
   - Lấy recipe của menu_item
   - Với mỗi recipe_ingredient:
     - Tính: deduct_qty = recipe_qty × order_qty
     - Trừ ingredients.current_stock
     - Ghi stock_transactions (ORDER_DEDUCT)
4. Kiểm tra nếu current_stock <= min_stock → tạo alert
5. Ghi audit log

**Alternative:**

- 3a. Món không có recipe → skip, ghi warning log
- 3b. Stock không đủ (tuỳ config):
  - Option A: Block → trả lỗi cho Order Service
  - Option B: Allow → trừ kho (có thể âm), ghi cảnh báo

---

## UC-07: Hoàn Kho Khi Huỷ Order

| Mục     | Chi tiết         |
| ------- | ---------------- |
| Actor   | System (tự động) |
| Trigger | Order bị huỷ     |

**Main Flow:**

1. Order Service gửi event: order cancelled
2. WMS tìm stock_transactions liên quan (reference_id = order_id, type = ORDER_DEDUCT)
3. Cộng lại stock cho từng ingredient
4. Ghi stock_transactions (type = ORDER_RESTORE)
5. Ghi audit log

---

## UC-08: Xem Audit Logs

| Mục          | Chi tiết                 |
| ------------ | ------------------------ |
| Actor        | Manager, Accountant      |
| Precondition | Có quyền audit_logs:read |

**Main Flow:**

1. User truy cập "Audit Logs"
2. Filter theo: user, action, resource, date range
3. Hệ thống hiển thị danh sách logs (phân trang)
4. User click vào log → xem chi tiết (old/new values)

---

## UC-09: Cảnh Báo Tồn Kho Thấp

| Mục     | Chi tiết                          |
| ------- | --------------------------------- |
| Actor   | System → Warehouse Staff, Manager |
| Trigger | current_stock <= min_stock        |

**Main Flow:**

1. Sau mỗi lần trừ kho, hệ thống check điều kiện
2. Nếu current_stock <= min_stock:
   - Tạo notification trong hệ thống
   - Gửi notification cho Warehouse Staff + Manager
3. Notification hiển thị: tên nguyên liệu, tồn hiện tại, mức tối thiểu

---

## UC-10: Báo Cáo

| Mục   | Chi tiết            |
| ----- | ------------------- |
| Actor | Manager, Accountant |

**UC-10a: Báo cáo tồn kho**

- Tổng hợp tất cả nguyên liệu, số lượng, giá trị
- Filter theo category
- Export Excel

**UC-10b: Báo cáo biến động**

- Nhập/xuất trong khoảng thời gian
- Biểu đồ trend

**UC-10c: Phân tích chi phí** _(hiện thay bằng:)_

- `GET /reports/ingredient-usage` — tiêu hao nguyên liệu
- `GET /reports/consumption-variance` — chênh lệch tiêu hao thực tế vs định mức công thức

---

## UC-11: Kiểm Kê (Stocktake)

| Mục   | Chi tiết                 |
| ----- | ------------------------ |
| Actor | Warehouse Staff, Manager |

1. Tạo phiên kiểm kê → hệ thống snapshot `system_qty` từ tồn hiện tại của mọi nguyên liệu (status DRAFT)
2. Nhập `actual_qty` thực đếm cho từng dòng → hệ thống tính `difference`
3. Complete → `current_stock = actual_qty`, ghi stock_transactions (STOCKTAKE_ADJUST), status COMPLETED

---

## UC-12: Trả Hàng NCC + Công Nợ

| Mục   | Chi tiết           |
| ----- | ------------------ |
| Actor | Warehouse, Manager |

1. Tạo phiếu trả: chọn NCC, lý do, các dòng (nguyên liệu, SL, đơn giá)
2. Hệ thống trừ tồn (type = RETURN) cho từng nguyên liệu
3. Giảm `supplier.total_debt` theo tổng giá trị trả
4. Ghi audit log

> Phiếu nhập tạo với `paid = false` sẽ **tăng công nợ NCC** khi được duyệt.

---

## UC-13: Thanh Toán Công Nợ NCC

| Mục   | Chi tiết            |
| ----- | ------------------- |
| Actor | Manager, Accountant |

1. Chọn NCC → nhập số tiền + phương thức (CASH / TRANSFER)
2. Hệ thống giảm `supplier.total_debt`
3. Ghi audit log

---

## UC-14: Quản Lý Lô + Hạn Sử Dụng

| Mục   | Chi tiết           |
| ----- | ------------------ |
| Actor | Warehouse, Manager |

1. Mỗi dòng phiếu nhập được duyệt tạo 1 lô (batch_code, quantity, cost, expiry_date, status ACTIVE)
2. Xem lô qua `GET /batches`
3. Cảnh báo lô sắp/đã hết hạn qua `GET /reports/expiring`

---

## UC-15: Đồng Bộ & Trừ Kho Từ KiotViet (POS)

| Mục   | Chi tiết                           |
| ----- | ---------------------------------- |
| Actor | Manager/Warehouse (quyền kiotviet) |

1. Đồng bộ order từ KiotViet (`/kiotviet/sync` hoặc `/kiotviet/sync-api`) → lưu `kiotviet_orders` (deducted=false)
2. Map dòng order → menu_item → recipe
3. Gọi deduct (`/kiotviet/orders/:id/deduct`) → trừ tồn theo recipe (ORDER_DEDUCT), đánh dấu `deducted=true`
