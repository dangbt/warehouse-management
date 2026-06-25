import { useState } from 'react'
import { Plus, Pencil, RefreshCw, ShieldCheck, ShieldOff } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { UserForm } from './user-form'
import { useUsers, useToggleUserActive } from '@/data'

interface UserRow { id: string; fullName: string; email: string; phone?: string; departmentId?: string; department: { name: string } | null; userRoles: { role: { id: string; name: string } }[]; isActive: boolean }

const columns: Column<UserRow>[] = [
  { key: 'fullName', header: 'Họ tên', width: 150 },
  { key: 'email', header: 'Email', width: 170 },
  { key: 'department', header: 'Bộ phận', width: 100, render: (r) => r.department?.name || '-' },
  { key: 'userRoles', header: 'Role', width: 130, render: (r) => r.userRoles?.map(ur => ur.role.name).join(', ') },
  { key: 'isActive', header: 'Trạng thái', width: 80, render: (r) => r.isActive ? <span className="text-win-success">Active</span> : <span className="text-win-error">Inactive</span> },
]

export function UsersPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [selected, setSelected] = useState<UserRow | null>(null)

  const { data: res, isLoading, refetch } = useUsers()
  const toggleMutation = useToggleUserActive()

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Thêm" onClick={() => { setFormMode('add'); setSelected(null); setFormOpen(true) }} />
        <WinToolbar.Button icon={<Pencil size={14} />} label="Sửa" disabled={!selected} onClick={() => { setFormMode('edit'); setFormOpen(true) }} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={selected?.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />} label={selected?.isActive ? 'Khoá' : 'Kích hoạt'} danger={selected?.isActive} disabled={!selected} onClick={() => selected && toggleMutation.mutate(selected.id)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <WinDataGrid columns={columns} data={res?.data ?? []} loading={isLoading} pagination={{ page: 1, limit: 20, total: res?.meta.total ?? 0 }} onRowClick={setSelected} onRowDoubleClick={(r) => { setSelected(r); setFormMode('edit'); setFormOpen(true) }} />
      <UserForm open={formOpen} mode={formMode} data={selected as any} onClose={() => { setFormOpen(false); refetch() }} />
    </div>
  )
}
