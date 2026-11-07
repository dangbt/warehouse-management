import { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { RefreshCw, Bell, PanelLeftClose, PanelLeft, CircleUserRound, CircleCheck, TriangleAlert } from 'lucide-react'
import { WinTreeView, WinStatusBar } from '@wms/ui-winforms'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { SupportWidget } from '@/components/support-widget'
import { ShortcutHelp } from '@/components/shortcut-help'
import { useHealth } from '@/data/use-health'
import { useTaxSettings } from '@/data'
import { now } from '@wms/shared'
import { NavIcon } from '@/components/nav-icons'
import type { TreeNode } from '@wms/ui-winforms'

/**
 * Cây menu bên trái. `isHousehold` bật mục "Sổ hộ kinh doanh" (chỉ áp dụng cho
 * hộ kinh doanh; ẩn khi chế độ VAT khấu trừ).
 */
function buildMenuTree(isHousehold: boolean): TreeNode[] {
  const taxChildren: TreeNode[] = [
    {
      id: 'tax-settings',
      label: 'Cấu hình thuế',
      icon: <NavIcon id="/tax-settings" size={15} />,
      route: '/tax-settings',
      permission: 'tax:read',
    },
    {
      id: 'tax-input-invoices',
      label: 'Bảng kê mua vào',
      icon: <NavIcon id="/tax/input-invoices" size={15} />,
      route: '/tax/input-invoices',
      permission: 'tax:read',
    },
    {
      id: 'tax-no-invoice-purchases',
      label: 'Bảng kê 01/TNDN',
      icon: <NavIcon id="/tax/no-invoice-purchases" size={15} />,
      route: '/tax/no-invoice-purchases',
      permission: 'tax:read',
    },
    {
      id: 'tax-output-revenue',
      label: 'Doanh thu theo thuế suất',
      icon: <NavIcon id="/tax/output-revenue" size={15} />,
      route: '/tax/output-revenue',
      permission: 'tax:read',
    },
    {
      id: 'tax-summary',
      label: 'Tổng hợp kỳ thuế',
      icon: <NavIcon id="/tax/summary" size={15} />,
      route: '/tax/summary',
      permission: 'tax:read',
    },
  ]
  if (isHousehold) {
    taxChildren.push({
      id: 'tax-books',
      label: 'Sổ hộ kinh doanh',
      icon: <NavIcon id="/tax/books" size={15} />,
      route: '/tax/books',
      permission: 'tax:read',
    })
  }
  return [
    {
      id: 'warehouse',
      label: 'Kho',
      icon: <NavIcon id="warehouse" />,
      permission: 'ingredients:read',
      children: [
        {
          id: 'ingredients',
          label: 'Nguyên liệu',
          icon: <NavIcon id="/ingredients" size={15} />,
          route: '/ingredients',
          permission: 'ingredients:read',
        },
        {
          id: 'groups',
          label: 'Nhóm nguyên liệu',
          icon: <NavIcon id="/ingredient-groups" size={15} />,
          route: '/ingredient-groups',
          permission: 'ingredients:read',
        },
        {
          id: 'imports',
          label: 'Nhập kho',
          icon: <NavIcon id="/import-orders" size={15} />,
          route: '/import-orders',
          permission: 'import_orders:read',
        },
        {
          id: 'exports',
          label: 'Xuất kho',
          icon: <NavIcon id="/stock-exports" size={15} />,
          route: '/stock-exports',
          permission: 'stock_exports:read',
        },
        {
          id: 'processing',
          label: 'Chế biến',
          icon: <NavIcon id="/processing" size={15} />,
          route: '/processing',
          permission: 'processing:read',
        },
        {
          id: 'suppliers',
          label: 'Nhà cung cấp',
          icon: <NavIcon id="/suppliers" size={15} />,
          route: '/suppliers',
          permission: 'suppliers:read',
        },
        {
          id: 'stocktake',
          label: 'Kiểm kê',
          icon: <NavIcon id="/stocktake" size={15} />,
          route: '/stocktake',
          permission: 'ingredients:read',
        },
        {
          id: 'purchase-requests',
          label: 'Đề nghị mua hàng',
          icon: <NavIcon id="/purchase-requests" size={15} />,
          route: '/purchase-requests',
          permission: 'purchase_requests:read',
        },
        {
          id: 'purchase-orders',
          label: 'Đơn mua hàng',
          icon: <NavIcon id="/purchase-orders" size={15} />,
          route: '/purchase-orders',
          permission: 'purchase_orders:read',
        },
        {
          id: 'returns',
          label: 'Trả hàng',
          icon: <NavIcon id="/purchase-returns" size={15} />,
          route: '/purchase-returns',
          permission: 'purchase_returns:read',
        },
      ],
    },
    {
      id: 'kitchen',
      label: 'Bếp',
      icon: <NavIcon id="kitchen" />,
      permission: 'recipes:read',
      children: [
        { id: 'menu', label: 'Thực đơn', icon: <NavIcon id="/menu" size={15} />, route: '/menu', permission: 'recipes:read' },
        { id: 'recipes', label: 'Công thức', icon: <NavIcon id="/recipes" size={15} />, route: '/recipes', permission: 'recipes:read' },
      ],
    },
    { id: 'kiotviet', label: 'KiotViet', icon: <NavIcon id="/kiotviet" />, route: '/kiotviet' },
    {
      id: 'tax',
      label: 'Thuế',
      icon: <NavIcon id="tax" />,
      permission: 'tax:read',
      children: taxChildren,
    },
    { id: 'reports', label: 'Báo cáo', icon: <NavIcon id="/reports" />, route: '/reports', permission: 'reports:read' },
    { id: 'usage', label: 'Báo cáo NL', icon: <NavIcon id="/ingredient-usage" />, route: '/ingredient-usage', permission: 'reports:read' },
    { id: 'costing', label: 'Tính giá xuất kho', icon: <NavIcon id="/costing" />, route: '/costing', permission: 'tax:read' },
    { id: 'inventory-period', label: 'Khoá sổ kho', icon: <NavIcon id="/inventory-period" />, route: '/inventory-period', permission: 'inventory_period:read' },
    { id: 'inventory-summary', label: 'Nhập–Xuất–Tồn', icon: <NavIcon id="/inventory-summary" />, route: '/inventory-summary', permission: 'reports:read' },
    { id: 'stock-card', label: 'Thẻ kho', icon: <NavIcon id="/inventory-summary" />, route: '/stock-card', permission: 'reports:read' },
    {
      id: 'variance',
      label: 'Định mức',
      icon: <NavIcon id="/consumption-variance" />,
      route: '/consumption-variance',
      permission: 'reports:read',
    },
    {
      id: 'admin',
      label: 'Quản trị',
      icon: <NavIcon id="admin" />,
      permission: 'users:read',
      children: [
        { id: 'users', label: 'Users', icon: <NavIcon id="/users" size={15} />, route: '/users', permission: 'users:read' },
        { id: 'roles', label: 'Roles & Permissions', icon: <NavIcon id="/roles" size={15} />, route: '/roles', permission: 'users:read' },
        {
          id: 'audit',
          label: 'Audit Logs',
          icon: <NavIcon id="/audit-logs" size={15} />,
          route: '/audit-logs',
          permission: 'audit_logs:read',
        },
      ],
    },
  ]
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const { user, logout } = useAuthStore()
  const { sidebarExpanded, toggleSidebar } = useUIStore()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const health = useHealth()
  // Chỉ hộ kinh doanh mới có sổ kế toán hộ KD (S1/S2). Ẩn khi VAT khấu trừ.
  const taxSettings = useTaxSettings({ enabled: hasPermission('tax:read') })
  const isHousehold = taxSettings.data?.regime === 'HOUSEHOLD'

  const filteredTree = filterTree(buildMenuTree(isHousehold), hasPermission)
  const activeNode = findActive(filteredTree, location.pathname)

  function findActive(nodes: TreeNode[], path: string): string | undefined {
    for (const n of nodes) {
      if (n.route === path) return n.id
      if (n.children) {
        const found = findActive(n.children, path)
        if (found) return found
      }
    }
  }

  function filterTree(nodes: TreeNode[], check: (p: string) => boolean): TreeNode[] {
    return nodes.reduce<TreeNode[]>((acc, node) => {
      if (node.permission && !check(node.permission)) return acc
      const children = node.children ? filterTree(node.children, check) : undefined
      if (node.children && (!children || children.length === 0)) return acc
      acc.push({ ...node, children })
      return acc
    }, [])
  }

  return (
    <div className="h-screen flex flex-col" data-testid="app-layout">
      {/* Title Bar */}
      <div className="h-9 bg-win-active-title text-white flex items-center px-3 text-[14px] font-semibold shrink-0 select-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-6 w-6 mr-2 shrink-0">
          <circle cx="16" cy="16" r="14" fill="white" />
          <text x="16" y="21" fontFamily="serif" fontSize="13" fill="#D4451A" textAnchor="middle" fontWeight="bold">
            MV
          </text>
        </svg>
        <span className="hidden sm:inline">Mâm Vị</span>
        <span className="sm:hidden">Mâm Vị</span>
      </div>

      {/* Menu Bar */}
      <div className="h-9 bg-win-menu border-b border-win-grid-border flex items-center px-1 text-win-base shrink-0 relative z-30 overflow-visible">
        <MenuDrop
          label="Hệ thống"
          items={[
            { label: 'Dashboard', route: '/dashboard' },
            ...(hasPermission('users:read')
              ? [
                  { label: 'Users', route: '/users' },
                  { label: 'Roles & Permissions', route: '/roles' },
                  { label: 'Audit Logs', route: '/audit-logs' },
                ]
              : []),
          ]}
          onNav={(r) => navigate({ to: r })}
        />
        {hasPermission('ingredients:read') && (
          <MenuDrop
            label="Kho"
            items={[
              { label: 'Nguyên liệu', route: '/ingredients' },
              { label: 'Nhóm nguyên liệu', route: '/ingredient-groups' },
              ...(hasPermission('import_orders:read') ? [{ label: 'Nhập kho', route: '/import-orders' }] : []),
              ...(hasPermission('stock_exports:read') ? [{ label: 'Xuất kho', route: '/stock-exports' }] : []),
              ...(hasPermission('processing:read') ? [{ label: 'Chế biến', route: '/processing' }] : []),
              ...(hasPermission('suppliers:read') ? [{ label: 'Nhà cung cấp', route: '/suppliers' }] : []),
              { label: 'Kiểm kê', route: '/stocktake' },
              ...(hasPermission('purchase_requests:read') ? [{ label: 'Đề nghị mua hàng', route: '/purchase-requests' }] : []),
              ...(hasPermission('purchase_orders:read') ? [{ label: 'Đơn mua hàng', route: '/purchase-orders' }] : []),
              ...(hasPermission('purchase_returns:read') ? [{ label: 'Trả hàng', route: '/purchase-returns' }] : []),
            ]}
            onNav={(r) => navigate({ to: r })}
          />
        )}
        {hasPermission('recipes:read') && (
          <MenuDrop
            label="Bếp"
            items={[
              { label: 'Thực đơn', route: '/menu' },
              { label: 'Công thức', route: '/recipes' },
            ]}
            onNav={(r) => navigate({ to: r })}
          />
        )}
        <MenuDrop label="KiotViet" items={[{ label: 'KiotViet', route: '/kiotviet' }]} onNav={(r) => navigate({ to: r })} />
        {hasPermission('tax:read') && (
          <MenuDrop
            label="Thuế"
            items={[
              { label: 'Cấu hình thuế', route: '/tax-settings' },
              { label: 'Bảng kê mua vào', route: '/tax/input-invoices' },
              { label: 'Bảng kê 01/TNDN', route: '/tax/no-invoice-purchases' },
              { label: 'Doanh thu theo thuế suất', route: '/tax/output-revenue' },
              ...(isHousehold ? [{ label: 'Sổ hộ kinh doanh', route: '/tax/books' }] : []),
            ]}
            onNav={(r) => navigate({ to: r })}
          />
        )}
        {hasPermission('reports:read') && (
          <MenuDrop
            label="Báo cáo"
            items={[
              { label: 'Báo cáo', route: '/reports' },
              { label: 'Báo cáo NL', route: '/ingredient-usage' },
              { label: 'Nhập – Xuất – Tồn', route: '/inventory-summary' },
              { label: 'Thẻ kho / Sổ chi tiết VT', route: '/stock-card' },
              { label: 'Tính giá xuất kho', route: '/costing' },
              { label: 'Khoá sổ kho', route: '/inventory-period' },
              { label: 'Định mức', route: '/consumption-variance' },
            ]}
            onNav={(r) => navigate({ to: r })}
          />
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2 pr-2 shrink-0">
          <Bell size={16} className="cursor-pointer" />
          <span className="text-win-base hidden md:inline-flex items-center gap-1">
            <CircleUserRound size={16} strokeWidth={1.75} /> {user?.full_name ?? 'Guest'}
          </span>
          <button
            onClick={() => {
              logout()
              navigate({ to: '/login' })
            }}
            className="text-win-base text-win-error hover:underline cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-11 bg-win-menu border-b border-win-grid-border flex items-center px-2 gap-1 shrink-0">
        <button onClick={toggleSidebar} className="p-1 hover:bg-win-menu-hover">
          {sidebarExpanded ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
        <div className="w-px h-5 bg-win-grid-border mx-1" />
        <button
          onClick={() => navigate({ to: '/dashboard' })}
          className="flex items-center gap-1.5 px-2 py-1 text-win-base hover:bg-win-menu-hover"
        >
          <NavIcon id="/dashboard" size={15} /> Dashboard
        </button>
        <button onClick={() => window.location.reload()} className="p-1 hover:bg-win-menu-hover">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - overlay on mobile, inline on desktop */}
        {sidebarExpanded && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={toggleSidebar} />
            <div className="w-[240px] border-r border-win-grid-border bg-white overflow-y-auto shrink-0 absolute md:relative z-40 h-full">
              <WinTreeView
                nodes={filteredTree}
                activeId={activeNode}
                onSelect={(node) => {
                  node.route && navigate({ to: node.route })
                  if (window.innerWidth < 768) toggleSidebar()
                }}
              />
            </div>
          </>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          <Outlet />
        </div>
      </div>

      {/* Status Bar */}
      <WinStatusBar>
        <WinStatusBar.Section>
          {health.isError ? (
            <span className="inline-flex items-center gap-1 text-win-error">
              <TriangleAlert size={13} /> Mất kết nối
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <CircleCheck size={13} className="text-green-600" /> Sẵn sàng
            </span>
          )}
        </WinStatusBar.Section>
        <WinStatusBar.Section>User: {user?.full_name ?? '-'}</WinStatusBar.Section>
        <WinStatusBar.Section>Role: {user?.roles?.[0] ?? '-'}</WinStatusBar.Section>
        <WinStatusBar.Section>{now()}</WinStatusBar.Section>
        <WinStatusBar.Section>v{__APP_VERSION__}</WinStatusBar.Section>
        <div className="flex-1" />
        <SupportWidget />
        <ShortcutHelp />
      </WinStatusBar>
    </div>
  )
}

function MenuDrop({ label, items, onNav }: { label: string; items: { label: string; route: string }[]; onNav: (route: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <span
        onClick={() => setOpen(!open)}
        className={`px-3 py-0.5 cursor-pointer ${open ? 'bg-win-grid-selected' : 'hover:bg-win-menu-hover'}`}
      >
        {label}
      </span>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-win-grid-border shadow-md z-50 min-w-[200px] py-0.5">
          {items.map((item) => (
            <div
              key={item.route}
              onClick={() => {
                onNav(item.route)
                setOpen(false)
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-win-base hover:bg-win-menu-hover cursor-pointer"
            >
              <NavIcon id={item.route} size={15} />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
