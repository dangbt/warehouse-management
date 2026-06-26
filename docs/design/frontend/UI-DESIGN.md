# Frontend UI Design Document

## Style: Windows Forms / Desktop Application

---

## 1. Design Philosophy

Giao diện mô phỏng style C# Windows Forms / Desktop Application:

- **MDI-like layout** (Multiple Document Interface) - 1 cửa sổ chính, nội dung thay đổi bên trong
- **Menu bar** phía trên (File, Edit, View, Tools, Help style)
- **Toolbar** với icon buttons cho thao tác nhanh
- **TreeView/Navigation panel** bên trái (như Solution Explorer)
- **DataGridView** cho hiển thị dữ liệu dạng bảng
- **StatusBar** phía dưới hiển thị thông tin trạng thái
- **Dialog/Modal** cho form nhập liệu (giống popup form WinForms)
- **Tab control** cho multi-document

---

## 2. Đặc Trưng Visual của Windows Forms

### 2.1 Color Palette

```
┌─────────────────────────────────────────┐
│ Window Background    : #F0F0F0 (Control)│
│ Window Frame         : #0078D4 (Active) │
│ Menu/Toolbar BG      : #F5F5F5          │
│ Grid Header BG       : #E8E8E8          │
│ Grid Row Alt         : #F9F9F9          │
│ Grid Border          : #D0D0D0          │
│ Selected Row         : #CCE8FF          │
│ Selected Row (focus) : #0078D4 text:#FFF│
│ Button Face          : #E1E1E1          │
│ Button Border        : #ADADAD          │
│ Text Primary         : #1E1E1E          │
│ Text Secondary       : #6D6D6D          │
│ StatusBar BG         : #007ACC          │
│ StatusBar Text       : #FFFFFF          │
│ Link                 : #0066CC          │
│ Error/Red            : #E81123          │
│ Warning/Yellow       : #FFB900          │
│ Success/Green        : #107C10          │
└─────────────────────────────────────────┘
```

### 2.2 Typography

- **Font:** Segoe UI (hệ thống Windows) hoặc fallback Inter
- **Size:** 12px body, 11px small/grid, 14px headings
- **Weight:** Regular 400, Semibold 600 cho headings

### 2.3 UI Controls Style

| WinForms Control | Web Equivalent  | Đặc điểm                                      |
| ---------------- | --------------- | --------------------------------------------- |
| MenuStrip        | Top menu bar    | Flat, hover highlight, dropdown               |
| ToolStrip        | Toolbar         | Icon buttons 24x24, separator, tooltip        |
| TreeView         | Sidebar nav     | Indent, expand/collapse, icons                |
| DataGridView     | Data table      | Header sort, resize columns, alternating rows |
| TabControl       | Tabs            | Top-aligned tabs                              |
| StatusStrip      | Status bar      | Fixed bottom, info panels                     |
| GroupBox         | Card/Section    | Border + title                                |
| TextBox          | Input           | 1px border, focus highlight                   |
| ComboBox         | Select/Dropdown | Arrow indicator                               |
| Button           | Button          | Raised, 3D border effect                      |
| DateTimePicker   | Date picker     | Calendar popup                                |
| NumericUpDown    | Number input    | Up/down arrows                                |
| ProgressBar      | Progress bar    | Animated fill                                 |
| MessageBox       | Modal dialog    | Icon + buttons (OK, Cancel, Yes, No)          |
| ToolTip          | Tooltip         | Yellow background (classic)                   |

---

## 3. Layout Structure

### 3.1 Main Application Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Icon] Warehouse Management System              [_] [□] [X]     │ ← Title Bar
├─────────────────────────────────────────────────────────────────┤
│ Hệ thống ▾ | Kho ▾ | Công thức ▾ | Báo cáo ▾ | Trợ giúp ▾    │ ← Menu Bar
├─────────────────────────────────────────────────────────────────┤
│ [🆕][💾][🗑️][✂️][📋] | [🔍] [🔄] | [👤 Nguyễn Văn A ▾]       │ ← Toolbar
├────────────┬────────────────────────────────────────────────────┤
│            │ [Nguyên liệu] [Phiếu nhập] [Nhà cung cấp]        │ ← Tabs
│  ≡ Menu    │────────────────────────────────────────────────────│
│            │                                                    │
│  📦 Kho    │  [Toolbar: Thêm | Sửa | Xoá | Refresh | Export]  │
│   ├ NL     │  ┌──────────────────────────────────────────────┐ │
│   ├ Nhập   │  │ Tên       │ ĐVT  │ Tồn kho │ Min  │ Giá    │ │ ← DataGrid
│   ├ Xuất   │  ├───────────┼──────┼─────────┼──────┼────────┤ │
│   └ NCC    │  │ Thịt bò   │ kg   │ 12.5    │ 5    │ 450k   │ │
│            │  │ Rau muống  │ kg   │ 3.0     │ 10   │ 25k    │ │ ← Low stock!
│  🍳 Bếp   │  │ Dầu ăn    │ lít  │ 8.0     │ 5    │ 45k    │ │
│   ├ CT     │  │ Hành tím  │ kg   │ 4.5     │ 3    │ 35k    │ │
│   └ Món    │  │ ...       │      │         │      │        │ │
│            │  └──────────────────────────────────────────────┘ │
│  📊 B.Cáo  │  [◀ 1 2 3 4 5 ▶]  Hiển thị 1-20 / 45 nguyên liệu│ ← Paging
│  👥 Users  │                                                    │
│  📋 Logs   │                                                    │
├────────────┴────────────────────────────────────────────────────┤
│ ✓ Sẵn sàng │ User: Nguyễn Văn A │ Role: Manager │ 25/06/2026  │ ← Status Bar
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Form Dialog (Add/Edit)

```
┌─────────────────────────────────────────┐
│ [🆕] Thêm Nguyên Liệu              [X] │ ← Dialog Title
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Thông tin nguyên liệu ───────────┐ │ ← GroupBox
│  │                                    │ │
│  │  Tên:          [________________] │ │
│  │  Đơn vị:       [kg         ▾   ] │ │
│  │  Phân loại:    [Thịt       ▾   ] │ │
│  │  Giá/đơn vị:   [_________ ₫   ] │ │
│  │  Tồn kho min:  [_____ ▲▼      ] │ │ ← NumericUpDown
│  │                                    │ │
│  └────────────────────────────────────┘ │
│                                         │
│              [ OK ]  [ Cancel ]         │ ← Buttons right-aligned
└─────────────────────────────────────────┘
```

### 3.3 Import Order Form

```
┌──────────────────────────────────────────────────────────┐
│ [📄] Phiếu Nhập Kho - PN-20260625-001               [X] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Thông tin chung ──────────────────────────────────┐ │
│  │ Mã phiếu:  PN-20260625-001    Ngày: 25/06/2026    │ │
│  │ NCC:       [Cty ABC          ▾]                    │ │
│  │ Ghi chú:   [_______________________________]      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ Chi tiết ──── [+ Thêm dòng] [- Xoá dòng] ───────┐ │
│  │ # │ Nguyên liệu    │ SL    │ Đơn giá  │ Thành tiền│ │
│  │───┼────────────────┼───────┼──────────┼───────────│ │
│  │ 1 │ [Thịt bò    ▾] │ [10 ] │ [450,000]│ 4,500,000│ │
│  │ 2 │ [Rau muống  ▾] │ [20 ] │ [25,000] │   500,000│ │
│  │ 3 │ [           ▾] │ [   ] │ [       ]│          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Tổng cộng:                              5,000,000 ₫   │
│                                                          │
│  Status: ⏳ Chờ duyệt                                    │
│                                                          │
│    [ 💾 Lưu ]  [ ✓ Duyệt ]  [ ✗ Từ chối ]  [ Đóng ]   │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Component Mapping

### React + ProUI → WinForms Style

| Cần build    | ProUI Component       | Custom Style                          |
| ------------ | --------------------- | ------------------------------------- |
| Title Bar    | Custom header         | Fixed top, brand color                |
| Menu Bar     | Custom nav            | Dropdown menus, hover state           |
| Toolbar      | ProUI Button group    | Icon buttons, separators              |
| Sidebar      | Custom TreeView       | Expand/collapse, icons, indent        |
| DataGrid     | ProTable              | WinForms grid style, header, alt rows |
| Tabs         | ProUI Tabs            | Top-aligned, flat style               |
| Form Dialog  | ProUI Modal + ProForm | GroupBox style, OK/Cancel             |
| StatusBar    | Custom footer         | Fixed bottom, sections                |
| MessageBox   | ProUI Modal           | Icon + buttons pattern                |
| Context Menu | Custom dropdown       | Right-click menu                      |

---

## 5. Interaction Patterns (Giống WinForms)

### 5.1 Navigation

- **Sidebar TreeView** click → load content vào main area
- **Double-click** row trong grid → mở form edit (dialog)
- **Right-click** row → context menu (Edit, Delete, View History...)
- **Keyboard shortcuts:** Ctrl+N (New), Ctrl+S (Save), Del (Delete), F5 (Refresh)

### 5.2 Data Grid Behaviors

- Click header → sort (▲/▼ indicator)
- Drag column border → resize
- Double-click cell → inline edit (nếu có quyền)
- Alternating row colors (#FFF / #F9F9F9)
- Selected row highlight (#CCE8FF)
- Row hover effect
- Checkbox column cho multi-select
- Right-click → context menu

### 5.3 Form Behaviors

- Tab order giữa các fields
- Enter → submit (OK button)
- Escape → close (Cancel)
- Required fields có \* đỏ
- Validation message hiện ngay dưới field
- Confirm dialog trước khi delete ("Bạn có chắc chắn muốn xoá?")

### 5.4 Status Bar

- Luôn hiển thị ở dưới cùng
- Sections: Status | User info | Role | DateTime
- Khi loading: hiển thị progress hoặc spinner text

---

## 6. Responsive Behavior

Vì style desktop app, responsive sẽ khác web thông thường:

| Breakpoint          | Behavior                                               |
| ------------------- | ------------------------------------------------------ |
| >= 1280px (Desktop) | Full layout như wireframe                              |
| 1024-1279px         | Sidebar collapsed (chỉ icons), expandable              |
| 768-1023px (Tablet) | Sidebar hidden, hamburger menu                         |
| < 768px             | Không hỗ trợ (hiện thông báo "Vui lòng dùng máy tính") |

---

## 7. Screens Chi Tiết

### 7.1 Login Screen

```
┌──────────────────────────────────────┐
│                                      │
│     ┌─────────────────────────┐      │
│     │  🏢 Warehouse System    │      │
│     │                         │      │
│     │  Email:                 │      │
│     │  [___________________]  │      │
│     │                         │      │
│     │  Mật khẩu:             │      │
│     │  [___________________]  │      │
│     │                         │      │
│     │  [✓] Ghi nhớ đăng nhập │      │
│     │                         │      │
│     │     [ Đăng Nhập ]       │      │
│     │                         │      │
│     └─────────────────────────┘      │
│                                      │
│  Status: Sẵn sàng                    │
└──────────────────────────────────────┘
```

### 7.2 Dashboard

- Giống "Properties Window" style: các panel thông tin
- Summary cards (tổng NL, phiếu chờ duyệt, cảnh báo)
- Recent activity log (giống Output window)
- Quick actions toolbar

### 7.3 Audit Logs Screen

```
┌─────────────────────────────────────────────────────────────┐
│ [Filter: User ▾] [Action ▾] [Từ ngày|___] [Đến|___] [🔍]  │
├─────────────────────────────────────────────────────────────┤
│ Thời gian      │ User        │ Action    │ Resource  │ Chi  │
│────────────────┼─────────────┼───────────┼───────────┼──────│
│ 25/06 10:30:00 │ Nguyễn A    │ APPROVE   │ import_.. │ [👁]│
│ 25/06 10:15:00 │ Trần B      │ CREATE    │ import_.. │ [👁]│
│ 25/06 09:45:00 │ Nguyễn A    │ UPDATE    │ ingredi..│ [👁]│
├─────────────────────────────────────────────────────────────┤
│ ── Detail Panel (click row to expand) ──────────────────── │
│ Old: { "name": "Thịt bò", "min_stock": 3 }                 │
│ New: { "name": "Thịt bò Úc", "min_stock": 5 }             │
│ IP: 192.168.1.10 | Browser: Chrome 126                     │
└─────────────────────────────────────────────────────────────┘
```
