import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { StockExportForm } from './StockExportForm'
import { api } from '@/services/api'
import { formatDate } from '@wms/shared'

interface StockExport { id: string; ingredient: { name: string; unit: string }; quantity: string; note: string; createdBy: { fullName: string }; createdAt: string }

const columns: Column<StockExport>[] = [
  { key: 'ingredient', header: 'Nguyên liệu', width: 150, render: (r) => r.ingredient?.name },
  { key: 'quantity', header: 'Số lượng', width: 80, render: (r) => String(Math.abs(Number(r.quantity))) },
  { key: 'ingredient', header: 'ĐVT', width: 60, render: (r) => r.ingredient?.unit },
  { key: 'note', header: 'Lý do', width: 200 },
  { key: 'createdBy', header: 'Người xuất', width: 120, render: (r) => r.createdBy?.fullName },
  { key: 'createdAt', header: 'Ngày', width: 100, render: (r) => formatDate(r.createdAt) },
]

export function StockExportsPage() {
  const [data, setData] = useState<StockExport[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/stock-exports?limit=50')
    setData(res.data); setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Xuất kho" onClick={() => setFormOpen(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={fetchData} />
      </WinToolbar>
      <WinDataGrid columns={columns} data={data} loading={loading} pagination={{ page: 1, limit: 50, total: data.length }} />
      <StockExportForm open={formOpen} onClose={() => { setFormOpen(false); fetchData() }} onSave={(d) => api.post('/stock-exports', d)} />
    </div>
  )
}
