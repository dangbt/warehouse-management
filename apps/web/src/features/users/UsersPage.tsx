import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, RefreshCw, ShieldCheck, ShieldOff } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { UserForm } from './UserForm'
import { api } from '@/services/api'

interface UserRow { id: string; fullName: string; email: string; phone?: string; departmentId?: string; department: { name: string } | null; userRoles: { role: { id: string; name: string } }[]; isActive: boolean }

const columns: Column<UserRow>[] = [
  { key: 'fullName', header: 'Họ tên', width: 150 },
  { key: 'email', header: 'Email', width: 170 },
  { key: 'department', header: 'Bộ phận', width: 100, render: (r) => r.department?.name || '-' },
  { key: 'userRoles', header: 'Role', width: 130, render: (r) => r.userRoles?.map(ur => ur.role.name).join(', ') },
  { key: 'isActive', header: 'Trạng thái', width: 80, render: (r) => r.isActive ? <span className="text-win-success">Active</span> : <span className="text-win-error">Inactive</span> },
]

export function UsersPage() {
  const [data, setData] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [selected, setSelected] = useState<UserRow | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/users?limit=50')
    setData(res.data); setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleActive = async () => {
    if (!selected) return
    await api.put(`/users/${selected.id}/toggle-active`, {})
    fetchData()
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Thêm" onClick={() => { setFormMode('add'); setSelected(null); setFormOpen(true) }} />
        <WinToolbar.Button icon={<Pencil size={14} />} label="Sửa" disabled={!selected} onClick={() => { setFormMode('edit'); setFormOpen(true) }} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={selected?.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />} label={selected?.isActive ? 'Khoá' : 'Kích hoạt'} disabled={!selected} onClick={toggleActive} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={fetchData} />
      </WinToolbar>
      <WinDataGrid columns={columns} data={data} loading={loading} pagination={{ page: 1, limit: 50, total: data.length }} onRowClick={setSelected} onRowDoubleClick={(r) => { setSelected(r); setFormMode('edit'); setFormOpen(true) }} />
      <UserForm open={formOpen} mode={formMode} data={selected} onClose={() => setFormOpen(false)} onSave={async (d) => { if (formMode === 'add') await api.post('/users', { email: d.email, full_name: d.full_name, phone: d.phone, department_id: d.department_id, role_ids: [d.role_id], password: d.password }); else await api.put(`/users/${selected?.id}`, { full_name: d.full_name, phone: d.phone, department_id: d.department_id }); fetchData() }} />
    </div>
  )
}
