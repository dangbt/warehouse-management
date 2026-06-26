import { Plus, RefreshCw } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useStocktakeSessions, useCreateStocktake } from '@/data'
import { formatDateTime } from '@wms/shared'
import type { StocktakeSession } from '@/data/use-stocktake'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Đang kiểm',
  COMPLETED: 'Hoàn thành',
}

const columns: Column<StocktakeSession>[] = [
  { key: 'code', header: 'Mã phiên', width: 140 },
  { key: 'createdAt', header: 'Ngày tạo', width: 150, render: (r) => formatDateTime(r.createdAt) },
  { key: 'status', header: 'Trạng thái', width: 100, align: 'center', render: (r) => STATUS_LABEL[r.status] ?? r.status },
  { key: '_count', header: 'Số NL', width: 80, align: 'right', render: (r) => String(r._count?.items ?? 0) },
]

export function StocktakePage() {
  const navigate = useNavigate()
  const { data: res, isLoading, refetch } = useStocktakeSessions()
  const createMutation = useCreateStocktake()

  const handleCreate = async () => {
    const session = await createMutation.mutateAsync()
    navigate({ to: '/stocktake_/$id', params: { id: (session as StocktakeSession).id } })
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Tạo phiên" onClick={handleCreate} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <WinDataGrid
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        onRowClick={(row) => navigate({ to: '/stocktake_/$id', params: { id: row.id } })}
        storageKey="stocktake"
      />
    </div>
  )
}
