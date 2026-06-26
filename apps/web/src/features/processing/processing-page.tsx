import { useState } from 'react'
import { Plus, CheckCircle, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { ProcessingForm } from './processing-form'
import { useProcessingOrders, useCreateProcessing, useCompleteProcessing } from '@/data'
import type { ProcessingOrder } from '@/data'
import { formatDate, formatNumber } from '@wms/shared'

const statusLabels: Record<string, string> = { DRAFT: 'Nháp', COMPLETED: 'Hoàn thành' }
const statusColors: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
}

const columns: Column<ProcessingOrder>[] = [
  { key: 'code', header: 'Mã phiếu', width: 160 },
  { key: 'source', header: 'Nguồn', width: 150, render: (r) => `${r.source?.name}` },
  { key: 'sourceQty', header: 'Lượng nguồn', width: 90, align: 'right', render: (r) => `${formatNumber(r.sourceQty)} ${r.source?.unit}` },
  { key: 'output', header: 'Thành phẩm', width: 150, render: (r) => `${r.output?.name}` },
  { key: 'outputQty', header: 'Thực thu', width: 90, align: 'right', render: (r) => `${formatNumber(r.outputQty)} ${r.output?.unit}` },
  {
    key: 'status',
    header: 'Trạng thái',
    width: 100,
    align: 'center',
    render: (r) => (
      <span className={`px-2 py-0.5 text-[10px] rounded ${statusColors[r.status] ?? ''}`}>{statusLabels[r.status] ?? r.status}</span>
    ),
  },
  { key: 'createdAt', header: 'Ngày tạo', width: 110, render: (r) => formatDate(r.createdAt) },
]

export function ProcessingPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<ProcessingOrder | null>(null)
  const [confirmComplete, setConfirmComplete] = useState(false)

  const { data: res, isLoading, refetch } = useProcessingOrders()
  const createMutation = useCreateProcessing()
  const completeMutation = useCompleteProcessing()

  const handleCreate = async (data: {
    source_ingredient_id: string
    source_qty: number
    output_ingredient_id: string
    output_qty?: number
    note?: string
  }) => {
    await createMutation.mutateAsync(data)
  }

  const handleComplete = () => {
    if (selected) {
      completeMutation.mutate(selected.id)
      setSelected(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Tạo phiếu" onClick={() => setFormOpen(true)} />
        <WinToolbar.Button
          icon={<CheckCircle size={14} />}
          label="Hoàn thành"
          disabled={!selected || selected.status !== 'DRAFT'}
          onClick={() => setConfirmComplete(true)}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>

      <WinDataGrid
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page: 1, limit: 20, total: res?.meta.total ?? 0 }}
        onRowClick={setSelected}
        storageKey="processing"
      />

      <ProcessingForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleCreate} />
      <WinMessageBox
        type="question"
        title="Xác nhận chế biến"
        message={`Hoàn thành phiếu "${selected?.code}"? Hệ thống sẽ trừ nguyên liệu nguồn và cộng thành phẩm.`}
        open={confirmComplete}
        buttons="yes_no"
        onResult={(r) => {
          setConfirmComplete(false)
          if (r === 'yes') handleComplete()
        }}
      />
    </div>
  )
}
