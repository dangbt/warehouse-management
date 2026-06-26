# Use Cases Document

## Hệ Thống Quản Lý Xuất Nhập Kho Nguyên Liệu Nhà Hàng

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

**UC-10c: Phân tích chi phí**

- Food cost per dish
- Tổng chi phí nguyên liệu theo tháng
- So sánh giữa các kỳ
