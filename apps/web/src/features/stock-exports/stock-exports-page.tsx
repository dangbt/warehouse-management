import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { StockExportForm } from './stock-export-form'
import { useStockExports, useCreateStockExport } from '@/data'
import { formatDate, formatNumber } from '@wms/shared'
import { Route } from '@/routes/_app/stock-exports'
import { FocusedVoucherBanner } from '@/components/focused-voucher-banner'

interface StockExport {
  id: string
  ingredient: { name: string; unit: string }
  quantity: string
  note: string
  createdBy: { fullName: string }
  createdAt: string
  voucherDate: string
  export?: { voucherNo: string } | null
}

const columns: Column<StockExport>[] = [
  { key: 'voucherDate', header: 'Ngày CT', width: 100, align: 'center', render: (r) => formatDate(r.voucherDate) },
  { key: 'voucherNo', header: 'Số CT', width: 140, render: (r) => r.export?.voucherNo ?? '' },
  { key: 'ingredient', header: 'Nguyên liệu', width: 150, render: (r) => r.ingredient?.name },
  {
    key: 'quantity',
    header: 'Số lượng',
    width: 80,
    align: 'right',
    render: (r) => formatNumber(Math.abs(Number(r.quantity))),
  },
  { key: 'ingredient', header: 'ĐVT', width: 60, align: 'center', render: (r) => r.ingredient?.unit },
  { key: 'note', header: 'Lý do', width: 200, render: (r) => {
    const reasons: Record<string, string> = { DAMAGED: 'Hỏng', EXPIRED: 'Hết hạn', RETURN: 'Trả NCC', INTERNAL_USE: 'Sử dụng nội bộ', OTHER: 'Khác' }
    const note = r.note ?? ''
    const parts = note.split(': ')
    const label = reasons[parts[0]] ?? parts[0]
    return parts.length > 1 ? `${label}: ${parts.slice(1).join(': ')}` : label
  }},
  { key: 'createdBy', header: 'Người xuất', width: 120, render: (r) => r.createdBy?.fullName },
]

export function StockExportsPage() {
  const { page, orderBy, sort, id: focusId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const setParams = (updates: Record<string, unknown>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) })
  }
  const setPage = (p: number) => setParams({ page: p })

  const [formOpen, setFormOpen] = useState(false)
  const { data: res, isLoading, refetch } = useStockExports({ id: focusId, page, orderBy, sort })
  const createMutation = useCreateStockExport()

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Xuất kho" onClick={() => setFormOpen(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      {focusId && <FocusedVoucherBanner label={res?.data[0]?.export?.voucherNo} onClear={() => setParams({ id: undefined })} />}
      <WinDataGrid searchable
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page, limit: 20, total: res?.meta.total ?? 0 }}
        onPageChange={setPage}
        onSort={(field, dir) => setParams({ orderBy: field, sort: dir, page: 1 })}
        storageKey="stock-exports"
      />
      <StockExportForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={(data) => createMutation.mutateAsync(data)}
      />
    </div>
  )
}
