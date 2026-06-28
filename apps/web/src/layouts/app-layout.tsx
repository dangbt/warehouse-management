import { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { RefreshCw, Bell, PanelLeftClose, PanelLeft } from 'lucide-react'
import { WinTreeView, WinStatusBar } from '@wms/ui-winforms'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { now } from '@wms/shared'
import type { TreeNode } from '@wms/ui-winforms'

const menuTree: TreeNode[] = [
  {
    id: 'warehouse',
    label: 'Kho',
    icon: '📦',
    permission: 'ingredients:read',
    children: [
      { id: 'ingredients', label: 'Nguyên liệu', route: '/ingredients', permission: 'ingredients:read' },
      { id: 'groups', label: 'Nhóm nguyên liệu', route: '/ingredient-groups', permission: 'ingredients:read' },
      { id: 'imports', label: 'Nhập kho', route: '/import-orders', permission: 'import_orders:read' },
      { id: 'exports', label: 'Xuất kho', route: '/stock-exports', permission: 'stock_exports:read' },
      { id: 'processing', label: 'Chế biến', route: '/processing', permission: 'processing:read' },
      { id: 'suppliers', label: 'Nhà cung cấp', route: '/suppliers', permission: 'suppliers:read' },
      { id: 'stocktake', label: 'Kiểm kê', route: '/stocktake', permission: 'ingredients:read' },
      { id: 'returns', label: 'Trả hàng', route: '/purchase-returns', permission: 'purchase_returns:read' },
    ],
  },
  {
    id: 'kitchen',
    label: 'Bếp',
    icon: '🍳',
    permission: 'recipes:read',
    children: [
      { id: 'menu', label: 'Thực đơn', route: '/menu', permission: 'recipes:read' },
      { id: 'recipes', label: 'Công thức', route: '/recipes', permission: 'recipes:read' },
    ],
  },
  { id: 'kiotviet', label: 'KiotViet', icon: '🛒', route: '/kiotviet' },
  { id: 'reports', label: 'Báo cáo', icon: '📊', route: '/reports', permission: 'reports:read' },
  { id: 'usage', label: 'Báo cáo NL', icon: '📉', route: '/ingredient-usage', permission: 'reports:read' },
  { id: 'variance', label: 'Định mức', icon: '⚖️', route: '/consumption-variance', permission: 'reports:read' },
  {
    id: 'admin',
    label: 'Quản trị',
    icon: '⚙️',
    permission: 'users:read',
    children: [
      { id: 'users', label: 'Users', route: '/users', permission: 'users:read' },
      { id: 'roles', label: 'Roles & Permissions', route: '/roles', permission: 'users:read' },
      { id: 'audit', label: 'Audit Logs', route: '/audit-logs', permission: 'audit_logs:read' },
    ],
  },
]

export function AppLayout() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const { user, logout } = useAuthStore()
  const { sidebarExpanded, toggleSidebar } = useUIStore()
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const filteredTree = filterTree(menuTree, hasPermission)
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
      <div className="h-8 bg-win-active-title text-white flex items-center px-3 text-xs font-semibold shrink-0 select-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-5 w-5 mr-2 shrink-0">
          <circle cx="16" cy="16" r="14" fill="white" />
          <text x="16" y="21" fontFamily="serif" fontSize="13" fill="#D4451A" textAnchor="middle" fontWeight="bold">
            MV
          </text>
        </svg>
        <span className="hidden sm:inline">Mâm Vị - Quản Lý Kho Nguyên Liệu</span>
        <span className="sm:hidden">Mâm Vị</span>
      </div>

      {/* Menu Bar (overflow-visible để dropdown không bị clip trên mobile) */}
      <div className="h-7 bg-win-menu border-b border-win-grid-border flex items-center px-1 text-[12px] shrink-0 relative z-30 overflow-visible">
        <MenuDrop
          label="Hệ thống"
          items={[
            { label: '🏠 Dashboard', route: '/dashboard' },
            ...(hasPermission('users:read')
              ? [
                  { label: '👥 Users', route: '/users' },
                  { label: '📋 Audit Logs', route: '/audit-logs' },
                ]
              : []),
          ]}
          onNav={(r) => navigate({ to: r })}
        />
        {hasPermission('ingredients:read') && (
          <MenuDrop
            label="Kho"
            items={[
              { label: '📦 Nguyên liệu', route: '/ingredients' },
              ...(hasPermission('import_orders:read') ? [{ label: '📥 Nhập kho', route: '/import-orders' }] : []),
              ...(hasPermission('stock_exports:read') ? [{ label: '📤 Xuất kho', route: '/stock-exports' }] : []),
              ...(hasPermission('suppliers:read') ? [{ label: '🏢 Nhà cung cấp', route: '/suppliers' }] : []),
            ]}
            onNav={(r) => navigate({ to: r })}
          />
        )}
        {hasPermission('recipes:read') && (
          <MenuDrop label="Công thức" items={[{ label: '🍳 Công thức', route: '/recipes' }]} onNav={(r) => navigate({ to: r })} />
        )}
        {hasPermission('reports:read') && (
          <MenuDrop label="Báo cáo" items={[{ label: '📊 Báo cáo', route: '/reports' }]} onNav={(r) => navigate({ to: r })} />
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2 pr-2 shrink-0">
          <Bell size={14} className="cursor-pointer" />
          <span className="text-[11px] hidden md:inline">👤 {user?.full_name ?? 'Guest'}</span>
          <button
            onClick={() => {
              logout()
              navigate({ to: '/login' })
            }}
            className="text-[11px] text-win-error hover:underline cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-9 bg-win-menu border-b border-win-grid-border flex items-center px-2 gap-1 shrink-0">
        <button onClick={toggleSidebar} className="p-1 hover:bg-win-menu-hover rounded">
          {sidebarExpanded ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
        <div className="w-px h-5 bg-win-grid-border mx-1" />
        <button onClick={() => navigate({ to: '/dashboard' })} className="px-2 py-1 text-[11px] hover:bg-win-menu-hover rounded-sm">
          🏠 Dashboard
        </button>
        <button onClick={() => window.location.reload()} className="p-1 hover:bg-win-menu-hover rounded">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - overlay on mobile, inline on desktop */}
        {sidebarExpanded && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={toggleSidebar} />
            <div className="w-[200px] border-r border-win-grid-border bg-white overflow-y-auto shrink-0 absolute md:relative z-40 h-full">
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
        <WinStatusBar.Section>✓ Sẵn sàng</WinStatusBar.Section>
        <WinStatusBar.Section>User: {user?.full_name ?? '-'}</WinStatusBar.Section>
        <WinStatusBar.Section>Role: {user?.roles?.[0] ?? '-'}</WinStatusBar.Section>
        <WinStatusBar.Section>{now()}</WinStatusBar.Section>
        <WinStatusBar.Section>v{__APP_VERSION__}</WinStatusBar.Section>
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
        className={`px-2.5 py-0.5 rounded-sm cursor-pointer ${open ? 'bg-win-grid-selected' : 'hover:bg-win-menu-hover'}`}
      >
        {label}
      </span>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-win-grid-border shadow-md rounded-sm z-50 min-w-[160px] py-0.5">
          {items.map((item) => (
            <div
              key={item.route}
              onClick={() => {
                onNav(item.route)
                setOpen(false)
              }}
              className="px-3 py-1 text-[11px] hover:bg-win-menu-hover cursor-pointer"
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
