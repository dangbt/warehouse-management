import { useState } from 'react'
import { Plus, RefreshCw, Shield } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinDialog, WinGroupBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useRoles, useCreateRole, useUpdateRolePermissions } from '@/data'

interface Role { id: string; name: string; code: string; description?: string; permissions: { id: string; resource: string; action: string }[] }

const columns: Column<Role>[] = [
  { key: 'name', header: 'Tên Role', width: 150 },
  { key: 'code', header: 'Mã', width: 120 },
  { key: 'description', header: 'Mô tả', width: 200 },
  { key: 'permissions', header: 'Số quyền', width: 80, render: (r) => String(r.permissions?.length || 0) },
]

const RESOURCES = ['ingredients', 'import_orders', 'stock_exports', 'recipes', 'suppliers', 'users', 'audit_logs', 'reports', 'roles', 'departments']
const ACTIONS = ['create', 'read', 'update', 'delete', 'approve']
const RESOURCE_LABELS: Record<string, string> = { ingredients: '📦 Nguyên liệu', import_orders: '📥 Nhập kho', stock_exports: '📤 Xuất kho', recipes: '🍳 Công thức', suppliers: '🏢 Nhà cung cấp', users: '👥 Người dùng', audit_logs: '📋 Audit Logs', reports: '📊 Báo cáo', roles: '🔑 Roles', departments: '🏗️ Bộ phận' }
const ACTION_LABELS: Record<string, string> = { create: 'Tạo', read: 'Xem', update: 'Sửa', delete: 'Xoá', approve: 'Duyệt' }

export function RolesPage() {
  const [selected, setSelected] = useState<Role | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [permOpen, setPermOpen] = useState(false)
  const [perms, setPerms] = useState<Record<string, boolean>>({})
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')

  const { data, isLoading, refetch } = useRoles()
  const createMutation = useCreateRole()
  const updatePermsMutation = useUpdateRolePermissions()

  const openPermissions = (role: Role) => {
    setSelected(role)
    const map: Record<string, boolean> = {}
    role.permissions?.forEach((p) => { map[`${p.resource}:${p.action}`] = true })
    setPerms(map)
    setPermOpen(true)
  }

  const savePermissions = () => {
    if (!selected) return
    const permissions = Object.entries(perms).filter(([, v]) => v).map(([key]) => { const [resource, action] = key.split(':'); return { resource, action } })
    updatePermsMutation.mutate({ id: selected.id, permissions })
    setPermOpen(false)
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Thêm Role" onClick={() => { setNewName(''); setNewCode(''); setFormOpen(true) }} />
        <WinToolbar.Button icon={<Shield size={14} />} label="Phân quyền" disabled={!selected} onClick={() => selected && openPermissions(selected)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>

      <WinDataGrid columns={columns} data={data ?? []} loading={isLoading} pagination={{ page: 1, limit: 20, total: data?.length ?? 0 }} onRowClick={setSelected} onRowDoubleClick={openPermissions} />

      {/* Create Role */}
      <WinDialog title="🆕 Thêm Role" open={formOpen} onClose={() => setFormOpen(false)} width={400} footer={
        <>
          <button onClick={() => { if (newName && newCode) { createMutation.mutate({ name: newName, code: newCode }); setFormOpen(false) } }} className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title rounded-sm min-w-[75px] cursor-pointer">OK</button>
          <button onClick={() => setFormOpen(false)} className="px-4 py-1 text-xs bg-win-button border border-win-button-border rounded-sm min-w-[75px] cursor-pointer hover:bg-win-button-hover">Cancel</button>
        </>
      }>
        <WinGroupBox title="Thông tin Role">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2"><label className="text-[11px] w-24 text-right shrink-0">Tên:</label><input value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 border border-win-input-border px-2 py-0.5 text-[11px] rounded-sm outline-none focus:border-win-input-focus" /></div>
            <div className="flex items-center gap-2"><label className="text-[11px] w-24 text-right shrink-0">Mã:</label><input value={newCode} onChange={(e) => setNewCode(e.target.value)} className="flex-1 border border-win-input-border px-2 py-0.5 text-[11px] rounded-sm outline-none focus:border-win-input-focus" /></div>
          </div>
        </WinGroupBox>
      </WinDialog>

      {/* Permissions */}
      <WinDialog title={`🔑 Phân quyền: ${selected?.name}`} open={permOpen} onClose={() => setPermOpen(false)} width={600} footer={
        <>
          <button onClick={savePermissions} className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title rounded-sm min-w-[75px] cursor-pointer">Lưu</button>
          <button onClick={() => setPermOpen(false)} className="px-4 py-1 text-xs bg-win-button border border-win-button-border rounded-sm min-w-[75px] cursor-pointer hover:bg-win-button-hover">Đóng</button>
        </>
      }>
        <div className="overflow-auto max-h-[400px]">
          <table className="w-full text-[11px] border border-win-grid-border">
            <thead className="sticky top-0"><tr className="bg-win-grid-header">
              <th className="p-1.5 text-left border-r border-win-grid-border">Module</th>
              {ACTIONS.map((a) => <th key={a} className="p-1.5 text-center border-r border-win-grid-border w-[60px]">{ACTION_LABELS[a]}</th>)}
            </tr></thead>
            <tbody>
              {RESOURCES.map((res) => (
                <tr key={res} className="border-t border-win-grid-border hover:bg-win-menu-hover">
                  <td className="p-1.5 font-medium border-r border-win-grid-border">{RESOURCE_LABELS[res] || res}</td>
                  {ACTIONS.map((act) => (
                    <td key={act} className="p-1.5 text-center border-r border-win-grid-border">
                      <input type="checkbox" checked={!!perms[`${res}:${act}`]} onChange={(e) => setPerms({ ...perms, [`${res}:${act}`]: e.target.checked })} className="cursor-pointer" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WinDialog>
    </div>
  )
}
