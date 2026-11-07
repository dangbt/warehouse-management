import { useEffect, useState } from 'react'
import { useListHotkeys } from '@/hooks/use-list-hotkeys'
import { useNavigate } from '@tanstack/react-router'
import { Ban, Check, ClipboardList, Copy, FileCode2, FileSpreadsheet, Pencil, Plus, Printer, ReceiptText, RefreshCw, Undo2, X } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { ImportOrderForm, type ImportOrderSeed } from './import-order-form'
import { ExcelImportDialog } from './excel-import/excel-import-dialog'
import { EinvoiceImportDialog } from './einvoice-import/einvoice-import-dialog'
import { openImportOrderPrint } from './print/voucher-form'
import {
  useImportOrders,
  useCreateImportOrder,
  useApproveImportOrder,
  useRejectImportOrder,
  useUnpostImportOrder,
  useCancelImportOrder,
  useUpdateImportOrder,
} from '@/data'
import { useAuthStore } from '@/stores/auth.store'
import { importOrderConfirmMessage, type ImportOrderAction } from './import-order-actions'
import { PeriodFilter } from '@/components/period-filter'
import { resolvePeriod } from '@/utils/period'
import { formatDate, formatCurrency, formatNumber, VAT_RATE_LABELS } from '@wms/shared'
import type { VatRate } from '@wms/shared'
import { FocusedVoucherBanner } from '@/components/focused-voucher-banner'
import { Route } from '@/routes/_app/import-orders'
import { useTerm } from '@/data/use-features'

interface ImportOrderItem {
  id: string
  ingredient: { id: string; name: string; unit: string }
  quantity: string
  unitPrice: string
  totalPrice: string
  vatRate?: string | null
  vatAmount?: string
}

interface ImportOrder {
  id: string
  code: string
  supplierId?: string
  supplier: { name: string }
  totalAmount: string
  status: string
  createdAt: string
  voucherDate: string
  voucherNo: string
  hasInvoice?: boolean
  invoiceNo?: string | null
  invoiceSymbol?: string | null
  invoiceDate?: string | null
  subtotal?: string
  vatAmount?: string
  items?: ImportOrderItem[]
  note?: string
  supplierId?: string
  paid?: boolean
  purchaseAddress?: string | null
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-200 text-gray-600',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  COMPLETED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã huỷ',
}

const columns: Column<ImportOrder>[] = [
  { key: 'voucherDate', header: 'Ngày CT', width: 100, align: 'center', render: (r) => formatDate(r.voucherDate) },
  { key: 'voucherNo', header: 'Số CT', width: 130 },
  { key: 'code', header: 'Mã phiếu', width: 170 },
  { key: 'supplier', header: 'NCC', width: 150, render: (r) => r.supplier?.name },
  {
    key: 'invoiceNo',
    header: 'Số HĐ',
    width: 110,
    render: (r) => (r.hasInvoice ? [r.invoiceSymbol, r.invoiceNo].filter(Boolean).join('/') || '—' : '—'),
  },
  {
    key: 'vatAmount',
    header: 'Tiền thuế',
    width: 110,
    align: 'right',
    render: (r) => (r.hasInvoice ? formatCurrency(r.vatAmount) : '—'),
  },
  {
    key: 'totalAmount',
    header: 'Tổng tiền',
    width: 120,
    align: 'right',
    render: (r) => formatCurrency(r.totalAmount),
  },
  {
    key: 'status',
    header: 'Trạng thái',
    width: 100,
    align: 'center',
    render: (r) => (
      <span className={`px-2 py-0.5 text-win-xs rounded ${statusColors[r.status] || ''}`}>{statusLabels[r.status] || r.status}</span>
    ),
  },
]

export function ImportOrdersPage() {
  const { id: focusId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const t = useTerm()
  const [selected, setSelected] = useState<ImportOrder | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ImportOrder | null>(null)
  const [excelOpen, setExcelOpen] = useState(false)
  const [xmlOpen, setXmlOpen] = useState(false)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [confirmAction, setConfirmAction] = useState<ImportOrderAction | null>(null)
  const [seed, setSeed] = useState<ImportOrderSeed | null>(null)
  const { page, status: statusFilter, period, from, to } = Route.useSearch()
  const setParams = (updates: Record<string, unknown>) => navigate({ search: (prev) => ({ ...prev, ...updates }) })

  const { data: res, isLoading, refetch } = useImportOrders({
    id: focusId,
    status: statusFilter || undefined,
    page,
    ...resolvePeriod(period, from, to),
  })
  const createMutation = useCreateImportOrder()
  const approveMutation = useApproveImportOrder()
  const rejectMutation = useRejectImportOrder()
  const unpostMutation = useUnpostImportOrder()
  const cancelMutation = useCancelImportOrder()
  const updateMutation = useUpdateImportOrder()

  // Mở từ Thẻ kho: tự chọn phiếu để hiện chi tiết.
  useEffect(() => {
    if (focusId && res?.data[0]?.id === focusId) setSelected(res.data[0] as ImportOrder)
  }, [focusId, res])

  const handleAction = (action: ImportOrderAction) => {
    if (!selected) return
    if (action === 'approve') approveMutation.mutate(selected.id)
    else if (action === 'reject') rejectMutation.mutate({ id: selected.id })
    else if (action === 'unpost') unpostMutation.mutate(selected.id)
    else cancelMutation.mutate(selected.id)
    setSelected(null)
  }

  /** Nhân bản: mở form tạo mới điền sẵn NCC + dòng hàng + thuế suất của phiếu đang chọn (ngày/số CT/HĐ để mới). */
  const handleClone = () => {
    if (!selected?.items?.length) return
    setSeed({
      supplierId: selected.supplierId ?? '',
      hasInvoice: !!selected.hasInvoice,
      note: selected.note,
      items: selected.items.map((i) => ({
        ingredient: i.ingredient,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        vatRate: i.vatRate,
      })),
    })
    setFormOpen(true)
  }

  const openAdd = () => {
    setSeed(null)
    setFormOpen(true)
  }
  useListHotkeys({
    onAdd: openAdd,
    onClone: selected?.items?.length ? handleClone : undefined,
    onDelete: selected?.status === 'PENDING' ? () => setConfirmAction('reject') : undefined,
    enabled: !formOpen && !confirmAction,
  })

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={16} />} label="Tạo phiếu" shortcut="F2" onClick={openAdd} />
        <WinToolbar.Button icon={<Copy size={16} />} label="Nhân bản" shortcut="Ctrl+D" disabled={!selected?.items?.length} onClick={handleClone} />
        <WinToolbar.Button icon={<FileSpreadsheet size={16} />} label="Nhập Excel" onClick={() => setExcelOpen(true)} />
        <WinToolbar.Button icon={<FileCode2 size={16} />} label="Nhập HĐ XML" onClick={() => setXmlOpen(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button
          icon={<Check size={16} />}
          label="Duyệt"
          disabled={selected?.status !== 'PENDING'}
          onClick={() => setConfirmAction('approve')}
        />
        <WinToolbar.Button
          icon={<X size={16} />}
          label="Từ chối"
          shortcut="Delete"
          danger
          disabled={selected?.status !== 'PENDING'}
          onClick={() => setConfirmAction('reject')}
        />
        <WinToolbar.Button
          icon={<Pencil size={16} />}
          label="Sửa"
          disabled={selected?.status !== 'PENDING' || !hasPermission('import_orders:create')}
          onClick={() => {
            setSeed(null)
            setEditing(selected)
            setFormOpen(true)
          }}
        />
        <WinToolbar.Button
          icon={<Undo2 size={16} />}
          label="Bỏ ghi"
          disabled={selected?.status !== 'COMPLETED' || !hasPermission('import_orders:approve')}
          onClick={() => setConfirmAction('unpost')}
        />
        <WinToolbar.Button
          icon={<Ban size={16} />}
          label="Huỷ phiếu"
          danger
          disabled={(selected?.status !== 'PENDING' && selected?.status !== 'REJECTED') || !hasPermission('import_orders:create')}
          onClick={() => setConfirmAction('cancel')}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button
          icon={<Printer size={16} />}
          label="In"
          disabled={!selected}
          onClick={() => selected && openImportOrderPrint(selected.id)}
        />
        <WinToolbar.Button icon={<RefreshCw size={16} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Separator />
        <select
          value={statusFilter}
          onChange={(e) => setParams({ status: e.target.value, page: 1 })}
          className="border border-win-input-border h-8 px-2 text-win-base outline-none"
        >
          <option value="">Tất cả</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="COMPLETED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
          <option value="CANCELLED">Đã huỷ</option>
        </select>
        <PeriodFilter period={period} from={from} to={to} onChange={(v) => setParams({ ...v, page: 1 })} />
      </WinToolbar>

      {focusId && <FocusedVoucherBanner label={res?.data[0]?.voucherNo} onClear={() => { setSelected(null); navigate({ search: (p) => ({ ...p, id: undefined }) }) }} />}
      <WinDataGrid
        searchable
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page, limit: 50, total: res?.meta.total ?? 0 }}
        onPageChange={(p) => setParams({ page: p })}
        footer={
          res?.meta.totals
            ? { vatAmount: formatCurrency(res.meta.totals.vatAmount), totalAmount: formatCurrency(res.meta.totals.totalAmount) }
            : undefined
        }
        onRowClick={setSelected}
        onRowDoubleClick={setSelected}
        storageKey="import-orders"
      />

      {selected?.items && selected.items.length > 0 && (
        <div className="border-t-2 border-win-grid-border bg-win-control p-3 max-h-80 overflow-auto shrink-0 text-[14px]">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
            <span className="text-[15px] font-semibold inline-flex items-center gap-1.5">
              <ClipboardList size={16} strokeWidth={1.75} className="text-win-active-title" /> Phiếu {selected.code}
            </span>
            <span>
              NCC: <strong>{selected.supplier?.name}</strong>
            </span>
            <span>Ngày CT: {formatDate(selected.voucherDate)}</span>
            <span className={`px-2 py-0.5 text-[12px] rounded ${statusColors[selected.status] || ''}`}>
              {statusLabels[selected.status] || selected.status}
            </span>
            <button
              type="button"
              data-testid="detail-print-button"
              onClick={() => openImportOrderPrint(selected.id)}
              className="inline-flex items-center gap-1 px-2 py-0.5 border border-win-grid-border bg-white cursor-pointer hover:bg-win-menu-hover"
            >
              <Printer size={14} strokeWidth={1.75} /> In phiếu
            </button>
          </div>
          {selected.hasInvoice && (
            <div className="mb-2">
              <ReceiptText size={14} strokeWidth={1.75} className="inline -mt-0.5 mr-1 text-win-active-title" />
              HĐ: <strong>{[selected.invoiceSymbol, selected.invoiceNo].filter(Boolean).join('/') || '—'}</strong>
              {selected.invoiceDate ? ` · Ngày ${formatDate(selected.invoiceDate)}` : ''}
              {selected.vatAmount ? ` · Tiền thuế ${formatCurrency(selected.vatAmount)}` : ''}
            </div>
          )}
          <table className="w-full text-[14px] bg-white border border-win-grid-border">
            <thead>
              <tr className="bg-win-grid-header">
                <th className="text-center p-1.5 w-[44px]">#</th>
                <th className="text-left p-1.5">{t('item')}</th>
                <th className="text-center p-1.5">ĐVT</th>
                <th className="text-right p-1.5">SL</th>
                <th className="text-right p-1.5">Đơn giá</th>
                <th className="text-right p-1.5">Thành tiền</th>
                {selected.hasInvoice && <th className="text-center p-1.5">Thuế suất</th>}
                {selected.hasInvoice && <th className="text-right p-1.5">Tiền thuế</th>}
              </tr>
            </thead>
            <tbody>
              {selected.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-win-grid-border">
                  <td className="p-1.5 text-center text-win-text-secondary">{idx + 1}</td>
                  <td className="p-1.5">{item.ingredient?.name}</td>
                  <td className="p-1.5 text-center">{item.ingredient?.unit}</td>
                  <td className="p-1.5 text-right">{formatNumber(item.quantity)}</td>
                  <td className="p-1.5 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="p-1.5 text-right">{formatCurrency(item.totalPrice)}</td>
                  {selected.hasInvoice && (
                    <td className="p-1.5 text-center">{item.vatRate ? (VAT_RATE_LABELS[item.vatRate as VatRate] ?? item.vatRate) : '—'}</td>
                  )}
                  {selected.hasInvoice && <td className="p-1.5 text-right">{formatCurrency(item.vatAmount)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap justify-end gap-x-6 mt-2">
            {selected.hasInvoice && selected.subtotal && (
              <span>
                Tiền hàng: <strong>{formatCurrency(selected.subtotal)}</strong>
              </span>
            )}
            {selected.hasInvoice && (
              <span>
                Thuế GTGT: <strong>{formatCurrency(selected.vatAmount)}</strong>
              </span>
            )}
            <span>
              Tổng thanh toán: <strong className="text-[16px] text-win-active-title">{formatCurrency(selected.totalAmount)}</strong>
            </span>
          </div>
          {selected.note && <div className="text-[13px] text-win-text-secondary mt-1">Diễn giải: {selected.note}</div>}
        </div>
      )}

      <ImportOrderForm
        open={formOpen}
        order={editing}
        seed={seed}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
          setSeed(null)
          refetch()
        }}
        onSave={async (data) => {
          if (editing) {
            await updateMutation.mutateAsync({ id: editing.id, data })
            setSelected(null)
          } else await createMutation.mutateAsync(data)
        }}
      />
      <ExcelImportDialog
        open={excelOpen}
        onClose={() => {
          setExcelOpen(false)
          refetch()
        }}
      />
      <EinvoiceImportDialog
        open={xmlOpen}
        onClose={() => {
          setXmlOpen(false)
          refetch()
        }}
      />
      <WinMessageBox
        type="question"
        title="Xác nhận"
        message={confirmAction ? importOrderConfirmMessage(confirmAction, selected?.code) : ''}
        open={!!confirmAction}
        buttons="yes_no"
        onResult={(r) => {
          if (r === 'yes' && confirmAction) handleAction(confirmAction)
          setConfirmAction(null)
        }}
      />
    </div>
  )
}
