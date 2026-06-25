# Screen Flows & User Journey

---

## 1. Login Flow

```
[Login Page]
    │
    ├── Success → [Dashboard] (theo role)
    │                 ├── Manager → Full sidebar
    │                 ├── Warehouse → Kho section only
    │                 ├── Kitchen → Bếp section only
    │                 └── Accountant → Báo cáo + Audit
    │
    └── Failed → Error message, retry
```

---

## 2. Nhập Kho Flow (Warehouse Staff + Manager)

```
[Sidebar: Kho > Nhập kho]
    │
    ▼
[Import Orders Page - Grid]
    │
    ├── Click [+ Thêm] ──► [Import Order Form Dialog]
    │                           │
    │                           ├── Chọn NCC (dropdown)
    │                           ├── Thêm dòng NL (ingredient picker + qty + price)
    │                           ├── Auto calc total
    │                           │
    │                           ├── [Lưu] → status=PENDING → Close → Refresh grid
    │                           └── [Huỷ] → Close
    │
    ├── Double-click row ──► [Import Order Detail Dialog]
    │                           │
    │                           ├── Hiển thị thông tin + items
    │                           │
    │                           ├── (Nếu PENDING + Manager):
    │                           │   ├── [✓ Duyệt] → Confirm MessageBox → Approve → Refresh
    │                           │   └── [✗ Từ chối] → Input reason → Reject → Refresh
    │                           │
    │                           ├── (Nếu COMPLETED + Manager):
    │                           │   └── [Huỷ phiếu] → Confirm → Cancel → Refresh
    │                           │
    │                           └── [Đóng]
    │
    └── Right-click row ──► [Context Menu]
                               ├── Xem chi tiết
                               ├── Duyệt (if PENDING + Manager)
                               ├── Từ chối (if PENDING + Manager)
                               └── In phiếu
```

---

## 3. Quản Lý Nguyên Liệu Flow

```
[Sidebar: Kho > Nguyên liệu]
    │
    ▼
[Ingredients Page]
    │
    ├── Toolbar: [Thêm] [Sửa] [Xoá] [Refresh] [Export]
    │
    ├── Filter Bar: [Phân loại ▾] [☐ Tồn kho thấp] [🔍 Search]
    │
    ├── DataGrid (columns: Tên, ĐVT, Tồn kho, Min, Giá, Phân loại)
    │      │
    │      ├── Row low stock → highlight đỏ + icon ⚠️
    │      ├── Click row → select (highlight blue)
    │      ├── Double-click → Edit Dialog
    │      └── Right-click → Context Menu
    │                          ├── Sửa
    │                          ├── Xoá
    │                          └── Xem lịch sử
    │
    ├── [Thêm] click ──► [Ingredient Form Dialog - mode: Create]
    │                        ├── Fields: Tên, ĐVT, Min stock, Giá, Phân loại
    │                        ├── [OK] → POST → Close → Refresh grid
    │                        └── [Cancel] → Close
    │
    ├── [Sửa] click (or dbl-click) ──► [Ingredient Form Dialog - mode: Edit]
    │                                     ├── Pre-filled fields
    │                                     ├── [OK] → PUT → Close → Refresh
    │                                     └── [Cancel] → Close
    │
    ├── [Xoá] click ──► [MessageBox: "Bạn có chắc chắn muốn xoá?"]
    │                        ├── [Yes] → DELETE → Refresh
    │                        └── [No] → Cancel
    │
    └── [Xem lịch sử] ──► [History Dialog]
                              └── Grid: Ngày, Loại, SL, Ref, User
```

---

## 4. Công Thức Flow (Kitchen)

```
[Sidebar: Bếp > Công thức]
    │
    ▼
[Recipes Page - Grid]
    │ Columns: Món ăn, Số NL, Serving size, Actions
    │
    ├── [+ Tạo công thức] ──► [Recipe Form Dialog]
    │                            │
    │                            ├── Select menu_item (dropdown)
    │                            ├── Serving size (numeric)
    │                            │
    │                            ├── ── Nguyên liệu ──────────────
    │                            │   [+ Thêm NL]
    │                            │   │ # │ Nguyên liệu ▾ │ SL │ ĐVT │ [X]
    │                            │   │ 1 │ Thịt bò       │ 0.2│ kg  │ [X]
    │                            │   │ 2 │ Hành tím      │ 50 │ g   │ [X]
    │                            │   │ 3 │ Nước dùng     │ 0.5│ lít │ [X]
    │                            │
    │                            ├── [OK] → Save → Refresh
    │                            └── [Cancel] → Close
    │
    └── Double-click ──► [Recipe Form - Edit mode]
```

---

## 5. Audit Logs Flow (Manager / Accountant)

```
[Sidebar: Quản trị > Audit Logs]
    │
    ▼
[Audit Logs Page]
    │
    ├── Filter Bar:
    │   [User ▾] [Action ▾] [Resource ▾] [Từ ngày] [Đến ngày] [🔍 Lọc]
    │
    ├── DataGrid:
    │   │ Thời gian │ User │ Action │ Resource │ Resource ID │
    │   │
    │   └── Click row → Expand detail panel below grid:
    │                     ┌─────────────────────────────┐
    │                     │ Old Values: { json }         │
    │                     │ New Values: { json }         │
    │                     │ IP: 192.168.1.10            │
    │                     │ User Agent: Chrome 126      │
    │                     └─────────────────────────────┘
    │
    └── Pagination: [◀ 1 2 3 ... 50 ▶] Total: 1,234 records
```

---

## 6. Dashboard Flow

```
[Dashboard Page]
    │
    ├── Summary Cards (top):
    │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │   │ 45       │ │ 3        │ │ 5        │ │ 12.5M    │
    │   │ Nguyên   │ │ Phiếu    │ │ NL tồn   │ │ Giá trị  │
    │   │ liệu     │ │ chờ duyệt│ │ thấp ⚠️  │ │ kho      │
    │   └──────────┘ └──────────┘ └──────────┘ └──────────┘
    │
    ├── Cảnh báo tồn kho thấp (table):
    │   │ NL │ Tồn │ Min │ Thiếu │
    │
    ├── Phiếu nhập chờ duyệt (list):
    │   │ Mã phiếu │ NCC │ Tổng tiền │ Ngày │ [Duyệt]
    │
    └── Hoạt động gần đây (activity log):
        │ 10:30 - Nguyễn A duyệt phiếu PN-001
        │ 10:15 - Trần B tạo phiếu PN-002
        │ 09:45 - System trừ kho Order #123
```

---

## 7. Notification System

### In-App Notifications (như system tray)
```
┌─────────────────────────────────────────────┐
│ 🔔 Thông báo (3)                        [X] │
├─────────────────────────────────────────────┤
│ ⚠️ Rau muống tồn kho thấp (3/10 kg)       │
│    2 phút trước                              │
│─────────────────────────────────────────────│
│ ✓ Phiếu PN-001 đã được duyệt               │
│    15 phút trước                             │
│─────────────────────────────────────────────│
│ ⚠️ Dầu ăn sắp hết hạn (27/06/2026)        │
│    1 giờ trước                               │
└─────────────────────────────────────────────┘
```

Notification icon trên toolbar, badge count, click mở dropdown panel.
