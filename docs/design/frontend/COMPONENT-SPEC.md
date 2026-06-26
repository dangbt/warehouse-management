# Frontend Component Specification

## Tech: React + @dangbt/pro-ui + Tailwind CSS v4

---

## 1. Project Structure

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── layouts/
│   │   └── AppLayout/
│   │       ├── index.tsx              # Main MDI layout
│   │       ├── TitleBar.tsx           # App title bar
│   │       ├── MenuBar.tsx            # Top menu (Hệ thống, Kho, ...)
│   │       ├── Toolbar.tsx            # Icon button bar
│   │       ├── Sidebar.tsx            # TreeView navigation
│   │       ├── ContentArea.tsx        # Main content + tabs
│   │       └── StatusBar.tsx          # Bottom status bar
│   ├── components/
│   │   ├── winforms/                  # WinForms-style reusable
│   │   │   ├── WinDataGrid.tsx        # DataGridView wrapper
│   │   │   ├── WinDialog.tsx          # Modal dialog (MessageBox)
│   │   │   ├── WinGroupBox.tsx        # GroupBox container
│   │   │   ├── WinToolbar.tsx         # ToolStrip buttons
│   │   │   ├── WinTabControl.tsx      # Tab pages
│   │   │   ├── WinTreeView.tsx        # TreeView nav
│   │   │   ├── WinStatusBar.tsx       # StatusStrip
│   │   │   ├── WinContextMenu.tsx     # Right-click menu
│   │   │   └── WinMessageBox.tsx      # Confirm/Alert dialog
│   │   └── shared/
│   │       ├── LoadingOverlay.tsx
│   │       └── LowStockBadge.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── useAuth.ts
│   │   ├── ingredients/
│   │   │   ├── IngredientsPage.tsx    # Grid + toolbar
│   │   │   ├── IngredientForm.tsx     # Add/Edit dialog
│   │   │   └── IngredientHistory.tsx  # Stock history
│   │   ├── import-orders/
│   │   │   ├── ImportOrdersPage.tsx
│   │   │   ├── ImportOrderForm.tsx    # Multi-line form
│   │   │   └── ImportOrderDetail.tsx
│   │   ├── stock-exports/
│   │   │   ├── StockExportsPage.tsx
│   │   │   └── StockExportForm.tsx
│   │   ├── recipes/
│   │   │   ├── RecipesPage.tsx
│   │   │   └── RecipeForm.tsx
│   │   ├── suppliers/
│   │   │   ├── SuppliersPage.tsx
│   │   │   └── SupplierForm.tsx
│   │   ├── users/
│   │   │   ├── UsersPage.tsx
│   │   │   └── UserForm.tsx
│   │   ├── audit-logs/
│   │   │   └── AuditLogsPage.tsx
│   │   ├── reports/
│   │   │   ├── StockSummaryReport.tsx
│   │   │   ├── StockMovementReport.tsx
│   │   │   └── CostAnalysisReport.tsx
│   │   └── dashboard/
│   │       └── DashboardPage.tsx
│   ├── hooks/
│   │   ├── usePermission.ts
│   │   ├── useKeyboardShortcut.ts
│   │   └── useContextMenu.ts
│   ├── services/
│   │   ├── api.ts                     # Axios instance
│   │   ├── auth.service.ts
│   │   ├── ingredient.service.ts
│   │   ├── import-order.service.ts
│   │   ├── recipe.service.ts
│   │   └── audit-log.service.ts
│   ├── stores/
│   │   ├── auth.store.ts
│   │   ├── ui.store.ts               # Sidebar state, active tab
│   │   └── notification.store.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       ├── winforms.css               # WinForms theme overrides
│       └── globals.css
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

---

## 2. Core Layout Components

### 2.1 AppLayout

```tsx
// Cấu trúc layout chính
<div className="h-screen flex flex-col">
  <TitleBar /> {/* 32px - App title */}
  <MenuBar /> {/* 28px - Menu items */}
  <Toolbar /> {/* 36px - Action buttons */}
  <div className="flex flex-1 overflow-hidden">
    <Sidebar /> {/* 220px - TreeView */}
    <ContentArea /> {/* flex-1 - Tabs + Content */}
  </div>
  <StatusBar /> {/* 24px - Status info */}
</div>
```

### 2.2 Sidebar (TreeView)

```tsx
interface TreeNode {
  id: string
  label: string
  icon: ReactNode
  children?: TreeNode[]
  route?: string
  permission?: string // Ẩn nếu không có quyền
}

const menuTree: TreeNode[] = [
  {
    id: 'warehouse',
    label: '📦 Kho',
    children: [
      { id: 'ingredients', label: 'Nguyên liệu', route: '/ingredients' },
      { id: 'imports', label: 'Nhập kho', route: '/import-orders' },
      { id: 'exports', label: 'Xuất kho', route: '/stock-exports' },
      { id: 'suppliers', label: 'Nhà cung cấp', route: '/suppliers' },
    ],
  },
  {
    id: 'kitchen',
    label: '🍳 Bếp',
    children: [
      { id: 'recipes', label: 'Công thức', route: '/recipes' },
      { id: 'menu', label: 'Thực đơn', route: '/menu-items' },
    ],
  },
  {
    id: 'reports',
    label: '📊 Báo cáo',
    route: '/reports',
  },
  {
    id: 'admin',
    label: '⚙️ Quản trị',
    permission: 'users:read',
    children: [
      { id: 'users', label: '👥 Users', route: '/users' },
      { id: 'roles', label: '🔑 Roles', route: '/roles' },
      { id: 'audit', label: '📋 Audit Logs', route: '/audit-logs' },
    ],
  },
]
```

### 2.3 WinDataGrid

```tsx
interface WinDataGridProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  loading?: boolean
  pagination?: { page: number; limit: number; total: number }
  onPageChange?: (page: number) => void
  onRowClick?: (row: T) => void
  onRowDoubleClick?: (row: T) => void // Mở form edit
  onContextMenu?: (row: T, e: MouseEvent) => void
  selectedRows?: T[]
  onSelectionChange?: (rows: T[]) => void
  toolbar?: ReactNode // Toolbar phía trên grid
  alternatingRows?: boolean // Default: true
  sortable?: boolean
  resizableColumns?: boolean
}
```

### 2.4 WinDialog (Form Dialog)

```tsx
interface WinDialogProps {
  title: string
  icon?: 'new' | 'edit' | 'info' | 'warning' | 'error'
  open: boolean
  onClose: () => void
  width?: number // Default: 480
  footer?: ReactNode // OK/Cancel buttons
  children: ReactNode
}
```

### 2.5 WinGroupBox

```tsx
interface WinGroupBoxProps {
  title: string
  children: ReactNode
}
// Render: border + title float trên border (giống GroupBox C#)
```

### 2.6 WinMessageBox

```tsx
interface WinMessageBoxProps {
  type: 'info' | 'warning' | 'error' | 'question'
  title: string
  message: string
  buttons: 'ok' | 'ok_cancel' | 'yes_no' | 'yes_no_cancel'
  onResult: (result: 'ok' | 'cancel' | 'yes' | 'no') => void
}
```

---

## 3. Page Component Pattern

Mỗi page feature theo pattern:

```tsx
function IngredientsPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <WinToolbar>
        <WinToolbar.Button icon={<Plus />} label="Thêm" onClick={handleAdd} />
        <WinToolbar.Button icon={<Edit />} label="Sửa" onClick={handleEdit} disabled={!selected} />
        <WinToolbar.Button icon={<Trash />} label="Xoá" onClick={handleDelete} disabled={!selected} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw />} label="Refresh" onClick={refetch} />
        <WinToolbar.Button icon={<Download />} label="Export" onClick={handleExport} />
      </WinToolbar>

      {/* Filter bar */}
      <FilterBar>
        <Select label="Phân loại" options={categories} />
        <Checkbox label="Chỉ hiện tồn kho thấp" />
        <SearchInput placeholder="Tìm kiếm..." />
      </FilterBar>

      {/* Data Grid */}
      <WinDataGrid
        columns={columns}
        data={ingredients}
        loading={isLoading}
        pagination={pagination}
        onRowDoubleClick={handleEdit}
        onContextMenu={handleContextMenu}
        alternatingRows
      />

      {/* Form Dialog */}
      <IngredientForm
        open={formOpen}
        mode={formMode}
        data={selectedIngredient}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
```

---

## 4. Keyboard Shortcuts

| Shortcut | Action           | Scope        |
| -------- | ---------------- | ------------ |
| Ctrl+N   | Thêm mới         | Grid pages   |
| Ctrl+S   | Lưu              | Form dialogs |
| Ctrl+F   | Focus search     | Global       |
| F5       | Refresh data     | Grid pages   |
| Delete   | Xoá selected     | Grid pages   |
| Enter    | Mở edit / Submit | Grid / Form  |
| Escape   | Đóng dialog      | Form dialogs |
| Ctrl+E   | Export           | Grid pages   |
| Alt+←    | Navigate back    | Global       |

---

## 5. State Management

```
Zustand stores:
├── authStore       # user, token, permissions
├── uiStore         # sidebar expanded, active tab, theme
└── notificationStore  # alerts, low stock warnings
```

React Query cho server state (data fetching, caching, sync).

---

## 6. Routing

```tsx
const routes = [
  { path: '/login', element: <LoginPage />, public: true },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'ingredients', element: <IngredientsPage />, permission: 'ingredients:read' },
      { path: 'import-orders', element: <ImportOrdersPage />, permission: 'import_orders:read' },
      { path: 'stock-exports', element: <StockExportsPage />, permission: 'stock_exports:read' },
      { path: 'suppliers', element: <SuppliersPage />, permission: 'suppliers:read' },
      { path: 'recipes', element: <RecipesPage />, permission: 'recipes:read' },
      { path: 'users', element: <UsersPage />, permission: 'users:read' },
      { path: 'roles', element: <RolesPage />, permission: 'roles:read' },
      { path: 'audit-logs', element: <AuditLogsPage />, permission: 'audit_logs:read' },
      { path: 'reports/*', element: <ReportsPage />, permission: 'reports:read' },
    ],
  },
]
```
