import { useState, useEffect, useCallback } from 'react'
import { Plus, Check, X, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { ImportOrderForm } from './ImportOrderForm'
import { api } from '@/services/api'
import { formatDate } from '@wms/shared'

interface ImportOrder { id: string; code: string; supplier: { name: string }; totalAmount: string; status: string; createdAt: string }

const statusColors: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-800', COMPLETED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800' }

const columns: Column<ImportOrder>[] = [
  { key: 'code', header: 'Mã phiếu', width: 170 },
  { key: 'supplier', header: 'NCC', width: 150, render: (r) => r.supplier?.name },
  { key: 'totalAmount', header: 'Tổng tiền', width: 120, render: (r) => `${Number(r.totalAmount).toLocaleString()}₫` },
  { key: 'status', header: 'Trạng thái', width: 100, render: (r) => <span className={`px-2 py-0.5 text-[10px] rounded ${statusColors[r.status] || ''}`}>{r.status}</span> },
  { key: 'createdAt', header: 'Ngày', width: 100, render: (r) => formatDate(r.createdAt) },
]

export function ImportOrdersPage() {
  const [data, setData] = useState<ImportOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ImportOrder | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/import-orders?limit=50')
    setData(res.data); setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selected) return
    await api.put(`/import-orders/${selected.id}/${action}`, {})
    setSelected(null); fetchData()
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Tạo phiếu" onClick={() => setFormOpen(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<Check size={14} />} label="Duyệt" disabled={selected?.status !== 'PENDING'} onClick={() => setConfirmAction('approve')} />
        <WinToolbar.Button icon={<X size={14} />} label="Từ chối" disabled={selected?.status !== 'PENDING'} onClick={() => setConfirmAction('reject')} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={fetchData} />
      </WinToolbar>

      <WinDataGrid columns={columns} data={data} loading={loading} pagination={{ page: 1, limit: 50, total: data.length }} onRowClick={setSelected} onRowDoubleClick={setSelected} />

      <ImportOrderForm open={formOpen} onClose={() => { setFormOpen(false); fetchData() }} onSave={(d) => api.post('/import-orders', { supplier_id: d.supplier_id, note: d.note, items: d.items })} />
      <WinMessageBox type="question" title="Xác nhận" message={confirmAction === 'approve' ? `Duyệt phiếu ${selected?.code}?` : `Từ chối phiếu ${selected?.code}?`} open={!!confirmAction} buttons="yes_no" onResult={(r) => { if (r === 'yes' && confirmAction) handleAction(confirmAction); setConfirmAction(null) }} />
    </div>
  )
}
