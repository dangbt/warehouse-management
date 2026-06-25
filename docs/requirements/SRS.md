# Software Requirements Specification (SRS)

## Hệ Thống Quản Lý Xuất Nhập Kho Nguyên Liệu Nhà Hàng

| Thông tin | Chi tiết |
|-----------|----------|
| Phiên bản | 1.0 |
| Ngày tạo | 2026-06-25 |
| Trạng thái | Draft |
| Tác giả | Team Dev |

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

| Đối tượng | Mô tả |
|-----------|--------|
| Quản lý (Manager) | Toàn quyền hệ thống, phê duyệt phiếu nhập |
| Nhân viên kho (Warehouse Staff) | Nhập/xuất kho, kiểm kê |
| Bếp trưởng/Nhân viên bếp (Kitchen) | Quản lý công thức, xem tồn kho |
| Nhân viên bar (Bar) | Xem tồn kho bar |
| Phục vụ (Service) | Tạo order |
| Thu ngân (Cashier) | Thanh toán |
| Kế toán (Accountant) | Xem báo cáo, chi phí |

### 1.4 Thuật ngữ

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| WMS | Warehouse Management System |
| Recipe | Công thức chế biến món ăn |
| Stock Deduct | Trừ kho tự động khi có order |
| Import Order | Phiếu nhập kho |
| Stock Transaction | Giao dịch kho (mỗi lần tăng/giảm stock) |
| RBAC | Role-Based Access Control |
| Audit Log | Nhật ký hoạt động |

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

## 4. Yêu Cầu Phi Chức Năng

### 4.1 Hiệu năng (Performance)
| ID | Yêu cầu |
|----|----------|
| NFR-PERF-01 | API response time < 500ms cho 95% requests |
| NFR-PERF-02 | Hỗ trợ tối thiểu 50 concurrent users |
| NFR-PERF-03 | Stock deduct phải hoàn thành < 2 giây/order |

### 4.2 Bảo mật (Security)
| ID | Yêu cầu |
|----|----------|
| NFR-SEC-01 | Password hash bcrypt, min 8 ký tự |
| NFR-SEC-02 | JWT access token expire 15 phút |
| NFR-SEC-03 | Rate limiting: max 5 login attempts / 15 phút |
| NFR-SEC-04 | HTTPS bắt buộc cho production |
| NFR-SEC-05 | SQL injection prevention (parameterized queries) |
| NFR-SEC-06 | Audit logs không thể xoá/sửa |

### 4.3 Khả dụng (Availability)
| ID | Yêu cầu |
|----|----------|
| NFR-AVL-01 | Uptime >= 99.5% |
| NFR-AVL-02 | Backup database hàng ngày |
| NFR-AVL-03 | Recovery time < 1 giờ |

### 4.4 Khả năng mở rộng (Scalability)
| ID | Yêu cầu |
|----|----------|
| NFR-SCL-01 | Hỗ trợ multi-branch (nhiều chi nhánh) trong tương lai |
| NFR-SCL-02 | Kiến trúc module hoá, dễ thêm module mới |

### 4.5 Tương thích (Compatibility)
| ID | Yêu cầu |
|----|----------|
| NFR-CMP-01 | Responsive: desktop, tablet |
| NFR-CMP-02 | Browser: Chrome, Safari, Firefox (latest 2 versions) |
| NFR-CMP-03 | API RESTful, JSON format |

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

| Ưu tiên | Modules |
|----------|---------|
| Must Have | Auth, Ingredients, Import/Export, Recipe, Auto Deduct, Audit Log |
| Should Have | Reports, Low Stock Alerts, Approval Flow |
| Nice to Have | Multi-branch, Barcode, Auto-suggest import, FIFO |

### 6.2 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-25 | Team Dev | Initial draft |
