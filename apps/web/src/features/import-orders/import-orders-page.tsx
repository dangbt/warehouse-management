import { useState } from 'react'
import { Plus, Check, X, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { ImportOrderForm } from './import-order-form'
import { useImportOrders, useCreateImportOrder, useApproveImportOrder, useRejectImportOrder } from '@/data'
import { formatDate, formatCurrency, formatNumber } from '@wms/shared'

interface ImportOrderItem {
  id: string
  ingredient: { name: string; unit: string }
  quantity: string
  unitPrice: string
  totalPrice: string
}

interface ImportOrder {
  id: string
  code: string
  supplier: { name: string }
  totalAmount: string
  status: string
  createdAt: string
  items?: ImportOrderItem[]
  note?: string
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  COMPLETED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

const columns: Column<ImportOrder>[] = [
  { key: 'code', header: 'Mã phiếu', width: 170 },
  { key: 'supplier', header: 'NCC', width: 150, render: (r) => r.supplier?.name },
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
      <span className={`px-2 py-0.5 text-[10px] rounded ${statusColors[r.status] || ''}`}>{statusLabels[r.status] || r.status}</span>
    ),
  },
  { key: 'createdAt', header: 'Ngày', width: 100, align: 'center', render: (r) => formatDate(r.createdAt) },
]

export function ImportOrdersPage() {
  const [selected, setSelected] = useState<ImportOrder | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const { data: res, isLoading, refetch } = useImportOrders({ status: statusFilter || undefined })
  const createMutation = useCreateImportOrder()
  const approveMutation = useApproveImportOrder()
  const rejectMutation = useRejectImportOrder()

  const handleAction = (action: 'approve' | 'reject') => {
    if (!selected) return
    if (action === 'approve') approveMutation.mutate(selected.id)
    else rejectMutation.mutate({ id: selected.id })
    setSelected(null)
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Tạo phiếu" onClick={() => setFormOpen(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button
          icon={<Check size={14} />}
          label="Duyệt"
          disabled={selected?.status !== 'PENDING'}
          onClick={() => setConfirmAction('approve')}
        />
        <WinToolbar.Button
          icon={<X size={14} />}
          label="Từ chối"
          danger
          disabled={selected?.status !== 'PENDING'}
          onClick={() => setConfirmAction('reject')}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Separator />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-win-input-border px-1 py-0.5 text-[11px] outline-none"
        >
          <option value="">Tất cả</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="COMPLETED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
        </select>
      </WinToolbar>

      <WinDataGrid searchable
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page: 1, limit: 20, total: res?.meta.total ?? 0 }}
        onRowClick={setSelected}
        onRowDoubleClick={setSelected}
        storageKey="import-orders"
      />

      {selected?.items && selected.items.length > 0 && (
        <div className="border-t border-win-grid-border bg-win-control p-2 max-h-40 overflow-auto shrink-0">
          <div className="text-[11px] font-semibold mb-1">📋 Chi tiết phiếu {selected.code}:</div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-win-grid-header">
                <th className="text-left p-1">Nguyên liệu</th>
                <th className="text-center p-1">ĐVT</th>
                <th className="text-right p-1">SL</th>
                <th className="text-right p-1">Đơn giá</th>
                <th className="text-right p-1">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {selected.items.map((item) => (
                <tr key={item.id} className="border-b border-win-grid-border">
                  <td className="p-1">{item.ingredient?.name}</td>
                  <td className="p-1 text-center">{item.ingredient?.unit}</td>
                  <td className="p-1 text-right">{formatNumber(item.quantity)}</td>
                  <td className="p-1 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="p-1 text-right">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selected.note && <div className="text-[10px] text-win-text-secondary mt-1">Ghi chú: {selected.note}</div>}
        </div>
      )}

      <ImportOrderForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          refetch()
        }}
        onSave={(data) => createMutation.mutateAsync(data)}
      />
      <WinMessageBox
        type="question"
        title="Xác nhận"
        message={confirmAction === 'approve' ? `Duyệt phiếu ${selected?.code}?` : `Từ chối phiếu ${selected?.code}?`}
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
