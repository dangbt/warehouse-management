# Software Requirements Specification (SRS)

## Hệ Thống Quản Lý Xuất Nhập Kho Nguyên Liệu Nhà Hàng

| Thông tin  | Chi tiết               |
| ---------- | ---------------------- |
| Phiên bản  | 1.1                    |
| Ngày tạo   | 2026-06-25             |
| Cập nhật   | 2026-06-26 (sync code) |
| Trạng thái | Living doc             |
| Tác giả    | Team Dev               |

---

## 0. Trạng Thái Triển Khai

Khác biệt giữa yêu cầu gốc và code hiện tại:

| Yêu cầu                                              | Trạng thái                                           |
| ---------------------------------------------------- | ---------------------------------------------------- |
| FR-AUTH-01 khoá tài khoản sau 5 lần sai / rate limit | ❌ Chưa (login chỉ trả access token)                 |
| Refresh token                                        | ❌ Chưa                                              |
| FR-IMP-03 Huỷ phiếu nhập đã duyệt                    | ❌ Chưa (không có endpoint cancel)                   |
| FR-DED-02 Hoàn kho khi huỷ order (ORDER_RESTORE)     | ❌ Chưa                                              |
| FR-DED-01 Trừ kho tự động                            | ✅ Qua KiotViet sync + deduct (không webhook)        |
| FR-RPT-03 Cảnh báo tồn thấp qua notification         | 🟡 Có report; chưa có push notification              |
| FR-RPT-04 Phân tích chi phí / food cost              | 🟡 Thay bằng ingredient-usage + consumption-variance |

**Module mới (đã code, bổ sung ở mục 3.9):** Lô + HSD (batches), Kiểm kê (stocktake), Trả hàng NCC + công nợ, Thanh toán NCC, Tích hợp KiotViet.

**Đề xuất chưa code (mục 3.10):** Bán thành phẩm (chế biến nội bộ), Gom nhóm nguyên liệu + báo cáo tồn theo nhóm, Quy đổi đơn vị 2 tầng (đóng gói thùng↔chai, tồn↔nhóm qua phần→kg).

---

## 1. Giới Thiệu

### 1.1 Mục đích

Tài liệu này mô tả chi tiết các yêu cầu chức năng và phi chức năng của Hệ thống Quản lý Xuất Nhập Kho Nguyên Liệu Nhà Hàng (Warehouse Management System - WMS).

### 1.2 Phạm vi

Hệ thống phục vụ quản lý kho nguyên liệu cho nhà hàng, bao gồm:

- Quản lý nhập/xuất kho nguyên liệu
- Tự động trừ kho dựa trên công thức khi có đơn hàng
- Phân quyền theo bộ phận và vai trò
- Theo dõi lịch sử hoạt động (audit logs)
- Báo cáo và cảnh báo tồn kho

### 1.3 Đối tượng sử dụng

| Đối tượng                          | Mô tả                                     |
| ---------------------------------- | ----------------------------------------- |
| Quản lý (Manager)                  | Toàn quyền hệ thống, phê duyệt phiếu nhập |
| Nhân viên kho (Warehouse Staff)    | Nhập/xuất kho, kiểm kê                    |
| Bếp trưởng/Nhân viên bếp (Kitchen) | Quản lý công thức, xem tồn kho            |
| Nhân viên bar (Bar)                | Xem tồn kho bar                           |
| Phục vụ (Service)                  | Tạo order                                 |
| Thu ngân (Cashier)                 | Thanh toán                                |
| Kế toán (Accountant)               | Xem báo cáo, chi phí                      |

### 1.4 Thuật ngữ

| Thuật ngữ         | Định nghĩa                              |
| ----------------- | --------------------------------------- |
| WMS               | Warehouse Management System             |
| Recipe            | Công thức chế biến món ăn               |
| Stock Deduct      | Trừ kho tự động khi có order            |
| Import Order      | Phiếu nhập kho                          |
| Stock Transaction | Giao dịch kho (mỗi lần tăng/giảm stock) |
| RBAC              | Role-Based Access Control               |
| Audit Log         | Nhật ký hoạt động                       |

---

## 2. Mô Tả Tổng Quan Hệ Thống

### 2.1 Bối cảnh

Nhà hàng cần một hệ thống số hoá việc quản lý kho nguyên liệu thay vì ghi chép thủ công, đảm bảo:

- Biết chính xác tồn kho real-time
- Tự động trừ kho khi bán hàng
- Cảnh báo khi nguyên liệu sắp hết
- Truy vết được ai làm gì, khi nào

### 2.2 Sơ đồ ngữ cảnh (Context Diagram)

```
                    ┌──────────────┐
                    │   Nhà cung   │
                    │     cấp     │
                    └──────┬───────┘
                           │ Giao hàng
                           ▼
┌──────────┐      ┌─────────────────┐      ┌──────────┐
│  Quản lý │◄────►│                 │◄────►│   Bếp    │
└──────────┘      │                 │      └──────────┘
                  │    WMS System   │
┌──────────┐      │                 │      ┌──────────┐
│   Kho    │◄────►│                 │◄────►│   Bar    │
└──────────┘      │                 │      └──────────┘
                  │                 │
┌──────────┐      │                 │      ┌──────────┐
│  Kế toán │◄────►│                 │◄────►│ Phục vụ  │
└──────────┘      └────────┬────────┘      └──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Order System │
                    │   (POS/App)   │
                    └──────────────┘
```

### 2.3 Giả định & Ràng buộc

**Giả định:**

- Nhà hàng đã có hệ thống Order (POS hoặc app)
- Mỗi món ăn có công thức cố định
- Nhân viên có thiết bị truy cập hệ thống (máy tính/tablet)

**Ràng buộc:**

- Hệ thống phải hoạt động 24/7
- Phải hỗ trợ đa thiết bị (responsive)
- Dữ liệu phải được backup hàng ngày

---

## 3. Yêu Cầu Chức Năng

### 3.1 Module Authentication & Authorization

#### FR-AUTH-01: Đăng nhập

- **Mô tả:** Người dùng đăng nhập bằng email + password
- **Input:** email, password
- **Output:** JWT access token + refresh token
- **Business Rules:**
  - Khoá tài khoản sau 5 lần đăng nhập sai liên tiếp (tự mở sau 15 phút)
  - Ghi audit log khi đăng nhập thành công/thất bại

#### FR-AUTH-02: Phân quyền RBAC

- **Mô tả:** Phân quyền dựa trên role, mỗi role có bộ permissions riêng
- **Business Rules:**
  - 1 user có thể có nhiều role
  - Permission = resource + action (vd: `ingredients:create`)
  - Kiểm tra quyền ở mọi API request

#### FR-AUTH-03: Quản lý Users

- **Mô tả:** Manager có thể tạo/sửa/khoá tài khoản nhân viên
- **Business Rules:**
  - Không xoá cứng, chỉ deactivate
  - Gán user vào department + roles

---

### 3.2 Module Quản Lý Nguyên Liệu

#### FR-ING-01: CRUD Nguyên liệu

- **Mô tả:** Quản lý danh mục nguyên liệu
- **Input:** name, unit, min_stock, cost_per_unit, category
- **Business Rules:**
  - Tên nguyên liệu không trùng
  - Không xoá nguyên liệu đang có trong recipe

#### FR-ING-02: Xem tồn kho

- **Mô tả:** Xem danh sách nguyên liệu kèm số lượng tồn
- **Output:** Danh sách nguyên liệu, filter theo category, trạng thái tồn kho
- **Business Rules:**
  - Highlight nguyên liệu có `current_stock <= min_stock`

#### FR-ING-03: Lịch sử biến động

- **Mô tả:** Xem lịch sử tăng/giảm stock của từng nguyên liệu
- **Output:** Timeline các stock_transactions, filter theo thời gian và loại

---

### 3.3 Module Nhập Kho

#### FR-IMP-01: Tạo phiếu nhập kho

- **Mô tả:** Nhân viên kho tạo phiếu nhập khi nhận hàng từ NCC
- **Input:** supplier, danh sách items (ingredient, quantity, unit_price, expiry_date)
- **Output:** Phiếu nhập trạng thái PENDING
- **Business Rules:**
  - Tự sinh mã phiếu: PN-YYYYMMDD-XXX
  - Tính total_amount = sum(items.total_price)
  - Chưa cập nhật stock (chờ duyệt)

#### FR-IMP-02: Phê duyệt phiếu nhập

- **Mô tả:** Manager duyệt phiếu nhập
- **Business Rules:**
  - Chỉ Manager mới có quyền approve/reject
  - Khi approve:
    - Status → COMPLETED
    - Cộng stock cho từng ingredient
    - Cập nhật cost_per_unit (weighted average)
    - Ghi stock_transactions (type = IMPORT)
    - Ghi audit log
  - Khi reject:
    - Status → REJECTED
    - Ghi lý do từ chối
    - Ghi audit log

#### FR-IMP-03: Huỷ phiếu nhập đã duyệt

- **Mô tả:** Manager huỷ phiếu nhập đã complete
- **Business Rules:**
  - Trừ lại stock đã cộng
  - Ghi stock_transactions đảo
  - Ghi audit log

---

### 3.4 Module Xuất Kho

#### FR-EXP-01: Xuất kho thủ công

- **Mô tả:** Xuất kho do hao hụt, hỏng, trả NCC, sử dụng nội bộ
- **Input:** ingredient, quantity, reason (DAMAGED, EXPIRED, RETURN, INTERNAL_USE)
- **Business Rules:**
  - Trừ stock ngay
  - Không cho xuất vượt quá current_stock
  - Ghi stock_transactions (type = EXPORT)
  - Ghi audit log

---

### 3.5 Module Công Thức (Recipe)

#### FR-RCP-01: CRUD Công thức

- **Mô tả:** Gán danh sách nguyên liệu + định lượng cho mỗi món ăn
- **Input:** menu_item_id, danh sách (ingredient, quantity, unit)
- **Business Rules:**
  - Mỗi menu_item có đúng 1 recipe
  - 1 recipe có nhiều recipe_ingredients

#### FR-RCP-02: Kiểm tra khả năng phục vụ

- **Mô tả:** Dựa trên tồn kho, tính được tối đa bao nhiêu phần có thể làm
- **Output:** max_servings = min(current_stock / recipe_quantity) cho mỗi nguyên liệu

---

### 3.6 Module Trừ Kho Tự Động

#### FR-DED-01: Trừ kho khi order

- **Mô tả:** Khi order được xác nhận, tự động trừ nguyên liệu theo công thức
- **Trigger:** Order status chuyển sang CONFIRMED
- **Business Rules:**
  - Với mỗi order_item: quantity_deduct = recipe_ingredient.quantity × order_item.quantity
  - Trừ ingredients.current_stock
  - Ghi stock_transactions (type = ORDER_DEDUCT, reference_id = order_id)
  - Nếu stock không đủ: tuỳ config → block order HOẶC chỉ cảnh báo
  - Ghi audit log

#### FR-DED-02: Hoàn kho khi huỷ order

- **Mô tả:** Khi order bị huỷ, hoàn lại nguyên liệu
- **Trigger:** Order status chuyển sang CANCELLED
- **Business Rules:**
  - Cộng lại stock theo đúng số lượng đã trừ
  - Ghi stock_transactions (type = ORDER_RESTORE)
  - Ghi audit log

---

### 3.7 Module Audit Logs

#### FR-AUD-01: Ghi log tự động

- **Mô tả:** Mọi thao tác CUD đều được ghi log tự động
- **Data:** user, action, resource, resource_id, old/new values, ip, timestamp
- **Business Rules:**
  - Append-only (không sửa/xoá)
  - Lưu diff (old_values vs new_values)

#### FR-AUD-02: Xem audit logs

- **Mô tả:** Manager/Accountant xem lịch sử hoạt động
- **Filter:** theo user, action, resource, date range
- **Output:** Danh sách logs phân trang

---

### 3.8 Module Báo Cáo

#### FR-RPT-01: Báo cáo tồn kho

- Tổng hợp tồn kho hiện tại, giá trị kho

#### FR-RPT-02: Báo cáo biến động kho

- Nhập/xuất theo thời gian, theo nguyên liệu

#### FR-RPT-03: Cảnh báo tồn kho thấp

- Danh sách nguyên liệu dưới mức min_stock
- Gửi notification cho Warehouse Staff + Manager

#### FR-RPT-04: Phân tích chi phí

- Chi phí nguyên liệu theo thời gian
- Food cost per dish

---

### 3.9 Module Bổ Sung (đã triển khai)

#### FR-BAT-01: Quản lý lô + hạn sử dụng (Batch / FIFO)

- Khi duyệt phiếu nhập, mỗi dòng nhập tạo 1 `ingredient_batch` (batch_code, quantity, cost_per_unit, expiry_date, status ACTIVE/DEPLETED).
- `GET /batches` xem lô; `GET /reports/expiring` liệt kê lô sắp/đã hết hạn.

#### FR-STK-01: Kiểm kê (Stocktake)

- Tạo phiên (DRAFT) → snapshot `system_qty` từ tồn hiện tại; nhập `actual_qty`, tính `difference`.
- Complete → `current_stock = actual_qty`, ghi `stock_transactions` (type = STOCKTAKE_ADJUST), status → COMPLETED.

#### FR-RET-01: Trả hàng NCC + Công nợ

- Tạo phiếu trả → trừ tồn (type = RETURN) + giảm `supplier.total_debt`.
- Phiếu nhập chưa thanh toán (`paid=false`) → tăng công nợ NCC khi duyệt.

#### FR-PAY-01: Thanh toán NCC

- Ghi nhận thanh toán (method CASH/TRANSFER) → giảm `supplier.total_debt`.

#### FR-POS-01: Tích hợp KiotViet

- Đồng bộ order từ KiotViet (`/kiotviet/sync`, `/kiotviet/sync-api`) → lưu `kiotviet_orders`.
- Deduct theo recipe (`/kiotviet/orders/:id/deduct`) → trừ kho, đánh dấu `deducted`.

---

### 3.10 (ĐỀ XUẤT — chưa code) Bán thành phẩm, Gom nhóm & Quy đổi đơn vị

> Bài toán: nhiều NL là _bán thành phẩm_ (BTP) chế biến từ NL sống — vd ba rọi sống → ba rọi chín/nướng;
> thịt bò sống → bò chín; vịt sống → vịt chín… Báo cáo tồn cần xem **tổng theo nhóm** quy về 1 đơn vị gốc.
> **Thiết kế tổng quát, cấu hình bằng dữ liệu, không hardcode từng món.** Chi tiết schema: `docs/PLAN.md`.

#### FR-PRO-01: Chế biến nội bộ (BTP)

- Phiếu chế biến: trừ NL sống (`source_qty`), cộng BTP (`output_qty` thực thu) → ghi stock_transactions `PROCESS_OUT` / `PROCESS_IN`.
- Yield mặc định (`yield_ratio`) chỉ để **gợi ý** lượng thu; người làm nhập **lượng thực thu** → bắt hao hụt.
- Giá vốn BTP = (source_qty × giá sống) / output_qty (hao hụt đẩy giá vốn/đơn vị BTP lên).
- Recipe món trỏ tới BTP → order trừ BTP (tồn 2 lớp); NL sống chỉ giảm khi chế biến.

#### FR-GRP-01: Gom nhóm nguyên liệu & báo cáo tồn theo nhóm

- Mỗi NL gắn `group_id`; nhóm có `base_unit` (vd kg).
- Tổng tồn nhóm = `Σ (current_stock × base_factor)` quy về `base_unit`.
- Hỗ trợ cảnh báo tồn thấp cấp nhóm (`ingredient_groups.min_stock`).

#### FR-UOM-01: Đơn vị tính & quy đổi (2 tầng)

- **Đóng gói ↔ tồn:** NL có thể có ĐVT phụ (`ingredient_units`: thùng/lốc + `factor`). Nhập theo thùng → user nhập số lượng + số chai/thùng (factor có thể sửa tại phiếu) → tồn cộng vào theo đơn vị tồn gốc (chai).
- **Tồn ↔ nhóm:** mỗi NL khai `base_factor` để quy đơn vị tồn của mình về `base_unit` của nhóm. VD: ba rọi chín tính theo **phần**, 1 phần = 0.22 kg ⇒ base_factor = 0.22 → tồn ba rọi quy ra **kg**.
- Đơn vị "chai" được bổ sung vào danh mục ĐVT.

---

## 4. Yêu Cầu Phi Chức Năng

### 4.1 Hiệu năng (Performance)

| ID          | Yêu cầu                                     |
| ----------- | ------------------------------------------- |
| NFR-PERF-01 | API response time < 500ms cho 95% requests  |
| NFR-PERF-02 | Hỗ trợ tối thiểu 50 concurrent users        |
| NFR-PERF-03 | Stock deduct phải hoàn thành < 2 giây/order |

### 4.2 Bảo mật (Security)

| ID         | Yêu cầu                                          |
| ---------- | ------------------------------------------------ |
| NFR-SEC-01 | Password hash bcrypt, min 8 ký tự                |
| NFR-SEC-02 | JWT access token expire 15 phút                  |
| NFR-SEC-03 | Rate limiting: max 5 login attempts / 15 phút    |
| NFR-SEC-04 | HTTPS bắt buộc cho production                    |
| NFR-SEC-05 | SQL injection prevention (parameterized queries) |
| NFR-SEC-06 | Audit logs không thể xoá/sửa                     |

### 4.3 Khả dụng (Availability)

| ID         | Yêu cầu                   |
| ---------- | ------------------------- |
| NFR-AVL-01 | Uptime >= 99.5%           |
| NFR-AVL-02 | Backup database hàng ngày |
| NFR-AVL-03 | Recovery time < 1 giờ     |

### 4.4 Khả năng mở rộng (Scalability)

| ID         | Yêu cầu                                               |
| ---------- | ----------------------------------------------------- |
| NFR-SCL-01 | Hỗ trợ multi-branch (nhiều chi nhánh) trong tương lai |
| NFR-SCL-02 | Kiến trúc module hoá, dễ thêm module mới              |

### 4.5 Tương thích (Compatibility)

| ID         | Yêu cầu                                              |
| ---------- | ---------------------------------------------------- |
| NFR-CMP-01 | Responsive: desktop, tablet                          |
| NFR-CMP-02 | Browser: Chrome, Safari, Firefox (latest 2 versions) |
| NFR-CMP-03 | API RESTful, JSON format                             |

---

## 5. Giao Diện Ngoài (External Interfaces)

### 5.1 Giao diện người dùng

- Web application (responsive)
- Hỗ trợ tiếng Việt

### 5.2 Giao diện phần cứng

- Không yêu cầu phần cứng đặc biệt
- Optional: máy quét barcode cho kiểm kê

### 5.3 Giao diện phần mềm

- Tích hợp với hệ thống Order (POS) qua API/webhook
- Optional: tích hợp email/SMS cho cảnh báo

---

## 6. Phụ Lục

### 6.1 Ưu tiên yêu cầu

| Ưu tiên      | Modules                                                          |
| ------------ | ---------------------------------------------------------------- |
| Must Have    | Auth, Ingredients, Import/Export, Recipe, Auto Deduct, Audit Log |
| Should Have  | Reports, Low Stock Alerts, Approval Flow                         |
| Nice to Have | Multi-branch, Barcode, Auto-suggest import, FIFO                 |

### 6.2 Revision History

| Version | Date       | Author   | Changes       |
| ------- | ---------- | -------- | ------------- |
| 1.0     | 2026-06-25 | Team Dev | Initial draft |
