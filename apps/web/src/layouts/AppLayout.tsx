import { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Warehouse, RefreshCw, Bell, PanelLeftClose, PanelLeft } from 'lucide-react'
import { WinTreeView, WinStatusBar } from '@wms/ui-winforms'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { now } from '@/utils/date'
import type { TreeNode } from '@wms/ui-winforms'

const menuTree: TreeNode[] = [
  { id: 'warehouse', label: 'Kho', icon: '📦', children: [
    { id: 'ingredients', label: 'Nguyên liệu', route: '/ingredients' },
    { id: 'imports', label: 'Nhập kho', route: '/import-orders' },
    { id: 'exports', label: 'Xuất kho', route: '/stock-exports' },
    { id: 'suppliers', label: 'Nhà cung cấp', route: '/suppliers' },
  ]},
  { id: 'kitchen', label: 'Bếp', icon: '🍳', children: [
    { id: 'recipes', label: 'Công thức', route: '/recipes' },
  ]},
  { id: 'reports', label: 'Báo cáo', icon: '📊', route: '/reports' },
  { id: 'admin', label: 'Quản trị', icon: '⚙️', permission: 'users:read', children: [
    { id: 'users', label: 'Users', route: '/users' },
    { id: 'roles', label: 'Roles & Permissions', route: '/roles' },
    { id: 'audit', label: 'Audit Logs', route: '/audit-logs' },
  ]},
]

export function AppLayout() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const { user, logout } = useAuthStore()
  const { sidebarExpanded, toggleSidebar } = useUIStore()

  const activeNode = findActive(menuTree, location.pathname)

  function findActive(nodes: TreeNode[], path: string): string | undefined {
    for (const n of nodes) {
      if (n.route === path) return n.id
      if (n.children) {
        const found = findActive(n.children, path)
        if (found) return found
      }
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Title Bar */}
      <div className="h-8 bg-win-active-title text-white flex items-center px-3 text-xs font-semibold shrink-0 select-none">
        <Warehouse size={14} className="mr-2" />
        Warehouse Management System
      </div>

      {/* Menu Bar */}
      <div className="h-7 bg-win-menu border-b border-win-grid-border flex items-center px-1 text-[12px] shrink-0">
        <MenuDrop label="Hệ thống" items={[{ label: '🏠 Dashboard', route: '/dashboard' }, { label: '👥 Users', route: '/users' }, { label: '📋 Audit Logs', route: '/audit-logs' }]} onNav={(r) => navigate({ to: r })} />
        <MenuDrop label="Kho" items={[{ label: '📦 Nguyên liệu', route: '/ingredients' }, { label: '📥 Nhập kho', route: '/import-orders' }, { label: '📤 Xuất kho', route: '/stock-exports' }, { label: '🏢 Nhà cung cấp', route: '/suppliers' }]} onNav={(r) => navigate({ to: r })} />
        <MenuDrop label="Công thức" items={[{ label: '🍳 Công thức', route: '/recipes' }]} onNav={(r) => navigate({ to: r })} />
        <MenuDrop label="Báo cáo" items={[{ label: '📊 Báo cáo', route: '/reports' }]} onNav={(r) => navigate({ to: r })} />
        <div className="flex-1" />
        <div className="flex items-center gap-2 pr-2">
          <Bell size={14} className="cursor-pointer" />
          <span className="text-[11px]">👤 {user?.full_name ?? 'Guest'}</span>
          <button onClick={() => { logout(); navigate({ to: '/login' }) }} className="text-[11px] text-win-error hover:underline cursor-pointer">Đăng xuất</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-9 bg-win-menu border-b border-win-grid-border flex items-center px-2 gap-1 shrink-0">
        <button onClick={toggleSidebar} className="p-1 hover:bg-win-menu-hover rounded">
          {sidebarExpanded ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
        <div className="w-px h-5 bg-win-grid-border mx-1" />
        <button onClick={() => navigate({ to: '/dashboard' })} className="px-2 py-1 text-[11px] hover:bg-win-menu-hover rounded-sm">🏠 Dashboard</button>
        <button onClick={() => window.location.reload()} className="p-1 hover:bg-win-menu-hover rounded"><RefreshCw size={14} /></button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarExpanded && (
          <div className="w-[200px] border-r border-win-grid-border bg-white overflow-y-auto shrink-0">
            <WinTreeView
              nodes={menuTree}
              activeId={activeNode}
              onSelect={(node) => node.route && navigate({ to: node.route })}
            />
          </div>
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
      </WinStatusBar>
    </div>
  )
}


function MenuDrop({ label, items, onNav }: { label: string; items: { label: string; route: string }[]; onNav: (route: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <span onClick={() => setOpen(!open)} className={`px-2.5 py-0.5 rounded-sm cursor-pointer ${open ? 'bg-win-grid-selected' : 'hover:bg-win-menu-hover'}`}>{label}</span>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-win-grid-border shadow-md rounded-sm z-50 min-w-[160px] py-0.5">
          {items.map((item) => (
            <div key={item.route} onClick={() => { onNav(item.route); setOpen(false) }} className="px-3 py-1 text-[11px] hover:bg-win-menu-hover cursor-pointer">{item.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}
