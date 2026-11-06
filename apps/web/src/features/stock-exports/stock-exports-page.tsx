import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Copy, Plus, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { StockExportForm, type StockExportSeed } from './stock-export-form'
import { useStockExports, useCreateStockExport } from '@/data'
import { formatDate, formatNumber, formatCurrency } from '@wms/shared'
import { PeriodFilter } from '@/components/period-filter'
import { resolvePeriod } from '@/utils/period'
import { Route } from '@/routes/_app/stock-exports'

interface StockExport {
  id: string
  ingredient: { id: string; name: string; unit: string; currentStock?: string }
  quantity: string
  totalPrice?: string | null
  note: string
  createdBy: { fullName: string }
  createdAt: string
  voucherDate: string
  export?: { voucherNo: string } | null
}

const REASON_LABELS: Record<string, string> = { DAMAGED: 'Hỏng', EXPIRED: 'Hết hạn', RETURN: 'Trả NCC', INTERNAL_USE: 'Sử dụng nội bộ', OTHER: 'Khác' }

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
  {
    key: 'totalPrice',
    header: 'Giá trị',
    width: 110,
    align: 'right',
    render: (r) => (r.totalPrice != null ? formatCurrency(Math.abs(Number(r.totalPrice))) : '—'),
  },
  { key: 'note', header: 'Lý do', width: 200, render: (r) => {
    const reasons = REASON_LABELS
    const note = r.note ?? ''
    const parts = note.split(': ')
    const label = reasons[parts[0]] ?? parts[0]
    return parts.length > 1 ? `${label}: ${parts.slice(1).join(': ')}` : label
  }},
  { key: 'createdBy', header: 'Người xuất', width: 120, render: (r) => r.createdBy?.fullName },
]

export function StockExportsPage() {
  const { page, orderBy, sort, period, from, to } = Route.useSearch()
  const range = resolvePeriod(period, from, to)
  const navigate = useNavigate({ from: Route.fullPath })

  const setParams = (updates: Record<string, unknown>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) })
  }
  const setPage = (p: number) => setParams({ page: p })

  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<StockExport | null>(null)
  const [seed, setSeed] = useState<StockExportSeed | null>(null)
  const { data: res, isLoading, refetch } = useStockExports({ page, orderBy, sort, ...range })
  const createMutation = useCreateStockExport()

  /** Nhân bản: mở form xuất kho điền sẵn nguyên liệu, số lượng, lý do (ngày/số CT mới). */
  const handleClone = (row: StockExport) => {
    const [reason, ...rest] = (row.note ?? '').split(': ')
    setSeed({
      ingredient: row.ingredient,
      quantity: Math.abs(Number(row.quantity)),
      reason: reason in REASON_LABELS ? reason : 'OTHER',
      note: rest.join(': '),
    })
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Xuất kho" onClick={() => {
            setSeed(null)
            setFormOpen(true)
          }} />
        <WinToolbar.Button icon={<Copy size={14} />} label="Nhân bản" disabled={!selected} onClick={() => selected && handleClone(selected)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Separator />
        <PeriodFilter period={period} from={from} to={to} onChange={(v) => setParams({ ...v, page: 1 })} />
      </WinToolbar>
      <WinDataGrid searchable
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page, limit: 20, total: res?.meta.total ?? 0 }}
        onPageChange={setPage}
        onSort={(field, dir) => setParams({ orderBy: field, sort: dir, page: 1 })}
        footer={res?.meta.totals ? { totalPrice: formatCurrency(res.meta.totals.totalPrice) } : undefined}
        onRowClick={setSelected}
        storageKey="stock-exports"
      />
      <StockExportForm
        open={formOpen}
        seed={seed}
        onClose={() => { setFormOpen(false); setSeed(null) }}
        onSave={(data) => createMutation.mutateAsync(data)}
      />
    </div>
  )
}
