import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Ban, Check, Plus, Printer, RefreshCw, Undo2 } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { formatDate, formatNumber } from '@wms/shared'
import { openPrint } from '@/components/print/print-utils'
import { PeriodFilter } from '@/components/period-filter'
import { WarehouseSelect } from '@/components/warehouse-select'
import { FocusedVoucherBanner } from '@/components/focused-voucher-banner'
import { resolvePeriod } from '@/utils/period'
import { useAuthStore } from '@/stores/auth.store'
import { useStockTransfers, useCreateStockTransfer, useStockTransferAction } from '@/data'
import type { StockTransfer } from '@/data'
import { Route } from '@/routes/_app/stock-transfers'
import { StockTransferForm } from './stock-transfer-form'

const STATUS_LABEL: Record<string, string> = { PENDING: 'Chờ duyệt', COMPLETED: 'Đã duyệt', CANCELLED: 'Đã huỷ' }
type Confirm = 'approve' | 'unpost' | 'cancel' | null
const CONFIRM_TEXT = {
  approve: 'Duyệt phiếu {no}? Hàng sẽ được trừ ở kho nguồn và nhập vào kho đích.',
  unpost: 'Bỏ ghi phiếu {no}? Hàng sẽ được trả về kho nguồn và gỡ khỏi kho đích.',
  cancel: 'Huỷ phiếu {no}?',
} as const

const columns: Column<StockTransfer>[] = [
  { key: 'voucherDate', header: 'Ngày CT', width: 100, align: 'center', render: (r) => formatDate(r.voucherDate) },
  { key: 'voucherNo', header: 'Số CT', width: 120 },
  { key: 'from', header: 'Kho nguồn', width: 140, render: (r) => r.fromWarehouse.name },
  { key: 'to', header: 'Kho đích', width: 140, render: (r) => r.toWarehouse.name },
  {
    key: 'items',
    header: 'Hàng chuyển',
    width: 260,
    render: (r) => r.items.map((i) => `${i.ingredient.name} × ${formatNumber(Number(i.quantity))} ${i.ingredient.unit}`).join('; '),
  },
  { key: 'status', header: 'Trạng thái', width: 100, align: 'center', render: (r) => STATUS_LABEL[r.status] ?? r.status },
  { key: 'note', header: 'Ghi chú', width: 160 },
]

export function StockTransfersPage() {
  const { page, period, from, to, warehouseId, id: focusId } = Route.useSearch()
  const range = resolvePeriod(period, from, to)
  const navigate = useNavigate({ from: Route.fullPath })
  const setParams = (updates: Record<string, unknown>) => navigate({ search: (prev) => ({ ...prev, ...updates }) })

  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<StockTransfer | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const { data: res, isLoading, refetch } = useStockTransfers({ id: focusId, page, warehouseId: warehouseId || undefined, ...range })
  const create = useCreateStockTransfer()
  const approve = useStockTransferAction('approve')
  const unpost = useStockTransferAction('unpost')
  const cancel = useStockTransferAction('cancel')
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canApprove = hasPermission('stock_transfers:approve')
  const canCreate = hasPermission('stock_transfers:create')

  const runConfirmed = () => {
    if (selected && confirm) ({ approve, unpost, cancel })[confirm].mutate(selected.id)
    setConfirm(null)
    setSelected(null)
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Chuyển kho" shortcut="F2" disabled={!canCreate} onClick={() => setFormOpen(true)} />
        <WinToolbar.Button icon={<Check size={14} />} label="Duyệt" disabled={selected?.status !== 'PENDING' || !canApprove} onClick={() => setConfirm('approve')} />
        <WinToolbar.Button icon={<Undo2 size={14} />} label="Bỏ ghi" disabled={selected?.status !== 'COMPLETED' || !canApprove} onClick={() => setConfirm('unpost')} />
        <WinToolbar.Button icon={<Ban size={14} />} label="Huỷ phiếu" danger disabled={selected?.status !== 'PENDING' || !canCreate} onClick={() => setConfirm('cancel')} />
        <WinToolbar.Button icon={<Printer size={14} />} label="In phiếu" disabled={!selected} onClick={() => selected && openPrint('stock-transfers', selected.id)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Separator />
        <PeriodFilter period={period} from={from} to={to} onChange={(v) => setParams({ ...v, page: 1 })} />
        <WarehouseSelect allowAll value={warehouseId} onChange={(v) => setParams({ warehouseId: v, page: 1 })} testId="filter-warehouse" />
      </WinToolbar>
      {focusId && <FocusedVoucherBanner label={res?.data[0]?.voucherNo} onClear={() => setParams({ id: undefined })} />}
      <WinDataGrid
        searchable
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page, limit: 20, total: res?.meta.total ?? 0 }}
        onPageChange={(p) => setParams({ page: p })}
        onRowClick={(r) => setSelected(r)}
        storageKey="stock-transfers"
      />
      <WinMessageBox
        type="question"
        title="Xác nhận"
        message={confirm ? CONFIRM_TEXT[confirm].replace('{no}', selected?.voucherNo ?? '') : ''}
        open={confirm !== null}
        buttons="yes_no"
        onResult={(r) => (r === 'yes' ? runConfirmed() : setConfirm(null))}
      />
      <StockTransferForm open={formOpen} onClose={() => setFormOpen(false)} onSave={(data) => create.mutateAsync(data)} />
    </div>
  )
}
