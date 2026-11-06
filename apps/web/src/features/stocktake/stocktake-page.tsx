import { Plus, RefreshCw } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useStocktakeSessions, useCreateStocktake, useVoucherFields } from '@/data'
import { formatDate } from '@wms/shared'
import { VoucherFields } from '@/components/voucher-fields'
import type { StocktakeSession } from '@/data/use-stocktake'

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  DRAFT: { text: 'Đang kiểm', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { text: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
}

const columns: Column<StocktakeSession>[] = [
  { key: 'voucherDate', header: 'Ngày CT', width: 100, align: 'center', render: (r) => formatDate(r.voucherDate) },
  { key: 'voucherNo', header: 'Số CT', width: 130 },
  { key: 'code', header: 'Mã phiên', width: 140 },
  { key: 'status', header: 'Trạng thái', width: 100, align: 'center', render: (r) => { const s = STATUS_LABEL[r.status]; return <span className={`px-2 py-0.5 text-win-xs rounded ${s?.color ?? ''}`}>{s?.text ?? r.status}</span> } },
  { key: '_count', header: 'Số NL', width: 80, align: 'right', render: (r) => String(r._count?.items ?? 0) },
]

export function StocktakePage() {
  const navigate = useNavigate()
  const { data: res, isLoading, refetch } = useStocktakeSessions()
  const createMutation = useCreateStocktake()
  const voucher = useVoucherFields('STOCKTAKE', true)

  const handleCreate = async () => {
    const session = await createMutation.mutateAsync(voucher.payload())
    navigate({ to: '/stocktake/$id', params: { id: (session as StocktakeSession).id } })
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={16} />} label="Tạo phiên" onClick={handleCreate} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={16} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <div className="flex items-center gap-4 px-2 py-1.5 border-b border-win-button-border">
        <VoucherFields {...voucher} />
      </div>
      <WinDataGrid
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        onRowClick={(row) => navigate({ to: '/stocktake/$id', params: { id: row.id } })}
        storageKey="stocktake"
      />
    </div>
  )
}
