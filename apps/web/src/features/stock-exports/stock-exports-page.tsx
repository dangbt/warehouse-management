import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { StockExportForm } from './stock-export-form'
import { useStockExports, useCreateStockExport } from '@/data'
import { formatDate } from '@wms/shared'

interface StockExport {
  id: string
  ingredient: { name: string; unit: string }
  quantity: string
  note: string
  createdBy: { fullName: string }
  createdAt: string
}

const columns: Column<StockExport>[] = [
  { key: 'ingredient', header: 'Nguyên liệu', width: 150, render: (r) => r.ingredient?.name },
  {
    key: 'quantity',
    header: 'Số lượng',
    width: 80,
    align: 'right',
    render: (r) => String(Math.abs(Number(r.quantity))),
  },
  { key: 'ingredient', header: 'ĐVT', width: 60, align: 'center', render: (r) => r.ingredient?.unit },
  { key: 'note', header: 'Lý do', width: 200 },
  { key: 'createdBy', header: 'Người xuất', width: 120, render: (r) => r.createdBy?.fullName },
  { key: 'createdAt', header: 'Ngày', width: 100, align: 'center', render: (r) => formatDate(r.createdAt) },
]

export function StockExportsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const { data: res, isLoading, refetch } = useStockExports()
  const createMutation = useCreateStockExport()

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Xuất kho" onClick={() => setFormOpen(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <WinDataGrid
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page: 1, limit: 20, total: res?.meta.total ?? 0 }}
      />
      <StockExportForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={(data) => createMutation.mutateAsync(data)}
      />
    </div>
  )
}
