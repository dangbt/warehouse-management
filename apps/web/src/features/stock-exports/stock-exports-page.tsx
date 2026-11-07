import { useState } from 'react'
import { useListHotkeys } from '@/hooks/use-list-hotkeys'
import { useNavigate } from '@tanstack/react-router'
import { Ban, Copy, Plus, Printer, RefreshCw } from 'lucide-react'
import { openPrint } from '@/components/print/print-utils'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { StockExportForm, type StockExportSeed } from './stock-export-form'
import { useStockExports, useCreateStockExport, useCancelStockExport } from '@/data'
import { useAuthStore } from '@/stores/auth.store'
import { formatDate, formatNumber, formatCurrency } from '@wms/shared'
import { PeriodFilter } from '@/components/period-filter'
import { resolvePeriod } from '@/utils/period'
import { Route } from '@/routes/_app/stock-exports'
import { FocusedVoucherBanner } from '@/components/focused-voucher-banner'

interface StockExport {
  id: string
  ingredient: { id: string; name: string; unit: string; currentStock?: string }
  quantity: string
  totalPrice?: string | null
  note: string
  createdBy: { fullName: string }
  createdAt: string
  voucherDate: string
  export?: { id: string; voucherNo: string; status: string } | null
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
  { key: 'status', header: 'Trạng thái', width: 100, align: 'center', render: (r) => (r.export?.status === 'CANCELLED' ? 'Đã huỷ' : 'Đã ghi sổ') },
  { key: 'createdBy', header: 'Người xuất', width: 120, render: (r) => r.createdBy?.fullName },
]

export function StockExportsPage() {
  const { page, orderBy, sort, period, from, to, id: focusId } = Route.useSearch()
  const range = resolvePeriod(period, from, to)
  const navigate = useNavigate({ from: Route.fullPath })

  const setParams = (updates: Record<string, unknown>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) })
  }
  const setPage = (p: number) => setParams({ page: p })

  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<StockExport | null>(null)
  const [seed, setSeed] = useState<StockExportSeed | null>(null)
  const { data: res, isLoading, refetch } = useStockExports({ id: focusId, page, orderBy, sort, ...range })
  const createMutation = useCreateStockExport()
  const cancelMutation = useCancelStockExport()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [confirmCancel, setConfirmCancel] = useState(false)

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

  const openAdd = () => {
    setSeed(null)
    setFormOpen(true)
  }
  useListHotkeys({
    onAdd: openAdd,
    onClone: selected ? () => handleClone(selected) : undefined,
    enabled: !formOpen,
  })

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Xuất kho" shortcut="F2" onClick={openAdd} />
        <WinToolbar.Button icon={<Copy size={14} />} label="Nhân bản" shortcut="Ctrl+D" disabled={!selected} onClick={() => selected && handleClone(selected)} />
        <WinToolbar.Button
          icon={<Printer size={14} />}
          label="In phiếu"
          disabled={!selected?.export?.id}
          onClick={() => selected?.export?.id && openPrint('stock-exports', selected.export.id)}
        />
        <WinToolbar.Button
          icon={<Ban size={14} />}
          label="Huỷ phiếu"
          danger
          disabled={!selected?.export || selected.export.status !== 'POSTED' || !hasPermission('stock_exports:create')}
          onClick={() => setConfirmCancel(true)}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Separator />
        <PeriodFilter period={period} from={from} to={to} onChange={(v) => setParams({ ...v, page: 1 })} />
      </WinToolbar>
      {focusId && <FocusedVoucherBanner label={res?.data[0]?.export?.voucherNo} onClear={() => setParams({ id: undefined })} />}
      <WinDataGrid searchable
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page, limit: 20, total: res?.meta.total ?? 0 }}
        onPageChange={setPage}
        onRowClick={(r) => setSelected(r)}
        onSort={(field, dir) => setParams({ orderBy: field, sort: dir, page: 1 })}
        footer={res?.meta.totals ? { totalPrice: formatCurrency(res.meta.totals.totalPrice) } : undefined}
        storageKey="stock-exports"
      />
      <WinMessageBox
        type="question"
        title="Xác nhận"
        message={`Huỷ phiếu xuất ${selected?.export?.voucherNo}? Tồn kho và lô đã trừ sẽ được trả lại.`}
        open={confirmCancel}
        buttons="yes_no"
        onResult={(r) => {
          if (r === 'yes' && selected?.export) cancelMutation.mutate(selected.export.id)
          setConfirmCancel(false)
          setSelected(null)
        }}
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
