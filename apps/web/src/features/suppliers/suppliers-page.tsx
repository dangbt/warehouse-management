import { useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Banknote } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox, WinDialog, WinGroupBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import type { Supplier } from '@/types'
import { SupplierForm } from './supplier-form'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/data'
import { useSupplierPayments, useCreateSupplierPayment } from '@/data'
import { formatDateTime } from '@wms/shared'

interface SupplierWithDebt extends Supplier {
  totalDebt?: string
}

const columns: Column<SupplierWithDebt>[] = [
  { key: 'name', header: 'Tên NCC', width: 180 },
  { key: 'phone', header: 'Điện thoại', width: 120 },
  { key: 'address', header: 'Địa chỉ', width: 200 },
  { key: 'totalDebt', header: 'Nợ', width: 120, align: 'right', render: (r) => {
    const debt = Number(r.totalDebt ?? 0)
    return debt > 0 ? <span className="text-win-error font-bold">{debt.toLocaleString()}₫</span> : '0₫'
  }},
  { key: 'note', header: 'Ghi chú', width: 150 },
]

export function SuppliersPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [selected, setSelected] = useState<SupplierWithDebt | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'CASH' | 'TRANSFER'>('CASH')
  const [payNote, setPayNote] = useState('')

  const { data: res, isLoading, refetch } = useSuppliers()
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const deleteMutation = useDeleteSupplier()
  const { data: payments } = useSupplierPayments(selected?.id)
  const paymentMutation = useCreateSupplierPayment()

  const handleSave = async (formData: { name: string; phone: string; address: string; note?: string }) => {
    if (formMode === 'add') {
      await createMutation.mutateAsync(formData)
    } else if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, ...formData })
    }
  }

  const handlePayment = async () => {
    if (!selected || !payAmount) return
    await paymentMutation.mutateAsync({
      supplierId: selected.id,
      amount: Number(payAmount),
      method: payMethod,
      note: payNote || undefined,
    })
    setPaymentOpen(false)
    setPayAmount('')
    setPayNote('')
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button
          icon={<Plus size={14} />}
          label="Thêm"
          onClick={() => {
            setFormMode('add')
            setSelected(null)
            setFormOpen(true)
          }}
        />
        <WinToolbar.Button
          icon={<Pencil size={14} />}
          label="Sửa"
          disabled={!selected}
          onClick={() => {
            setFormMode('edit')
            setFormOpen(true)
          }}
        />
        <WinToolbar.Button
          icon={<Trash2 size={14} />}
          label="Xoá"
          danger
          disabled={!selected}
          onClick={() => setConfirmDelete(true)}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button
          icon={<Banknote size={14} />}
          label="Thanh toán"
          disabled={!selected}
          onClick={() => setPaymentOpen(true)}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <WinDataGrid
        columns={columns}
        data={(res?.data ?? []) as SupplierWithDebt[]}
        loading={isLoading}
        pagination={{ page: 1, limit: 50, total: res?.meta.total ?? 0 }}
        onRowClick={(r) => setSelected(r)}
        onRowDoubleClick={(r) => {
          setSelected(r)
          setFormMode('edit')
          setFormOpen(true)
        }}
      />

      {selected && payments && payments.length > 0 && (
        <div className="border-t border-win-grid-border max-h-[180px] overflow-auto">
          <WinGroupBox title={`💰 Lịch sử thanh toán - ${selected.name}`}>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-win-grid-header">
                  <th className="text-left p-1">Ngày</th>
                  <th className="p-1">Số tiền</th>
                  <th className="p-1">PT</th>
                  <th className="text-left p-1">Người tạo</th>
                  <th className="text-left p-1">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-win-grid-border">
                    <td className="p-1">{formatDateTime(p.createdAt)}</td>
                    <td className="p-1 text-right text-win-success font-bold">{Number(p.amount).toLocaleString()}₫</td>
                    <td className="p-1 text-center">{p.method}</td>
                    <td className="p-1">{p.createdBy.fullName}</td>
                    <td className="p-1">{p.note ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </WinGroupBox>
        </div>
      )}

      <SupplierForm
        open={formOpen}
        mode={formMode}
        data={selected}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
      <WinMessageBox
        type="question"
        title="Xác nhận"
        message={`Xoá NCC "${selected?.name}"?`}
        open={confirmDelete}
        buttons="yes_no"
        onResult={(r) => {
          setConfirmDelete(false)
          if (r === 'yes' && selected) {
            deleteMutation.mutate(selected.id)
            setSelected(null)
          }
        }}
      />

      <WinDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Thanh toán cho NCC" width={400}>
        <div className="space-y-3 p-3">
          <div className="text-[11px]">NCC: <strong>{selected?.name}</strong></div>
          <div className="text-[11px]">Nợ hiện tại: <strong className="text-win-error">{Number(selected?.totalDebt ?? 0).toLocaleString()}₫</strong></div>
          <div>
            <label className="text-[11px] block mb-0.5">Số tiền thanh toán</label>
            <div className="flex gap-1">
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="flex-1 border border-win-input-border rounded-sm px-2 py-1 text-[11px] outline-none bg-white"
              />
              <button
                onClick={() => setPayAmount(String(Number(selected?.totalDebt ?? 0)))}
                className="px-2 py-1 text-[10px] bg-win-active-title text-white rounded-sm whitespace-nowrap"
              >
                Tất cả
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] block mb-0.5">Phương thức</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as 'CASH' | 'TRANSFER')}
              className="w-full border border-win-input-border rounded-sm px-2 py-1 text-[11px] outline-none bg-white"
            >
              <option value="CASH">Tiền mặt</option>
              <option value="TRANSFER">Chuyển khoản</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] block mb-0.5">Ghi chú</label>
            <input
              type="text"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Ghi chú thanh toán"
              className="w-full border border-win-input-border rounded-sm px-2 py-1 text-[11px] outline-none bg-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-win-grid-border">
            <button onClick={() => setPaymentOpen(false)} className="px-3 py-1 text-[11px] border border-win-grid-border rounded-sm hover:bg-win-menu-hover">Huỷ</button>
            <button onClick={handlePayment} className="px-3 py-1 text-[11px] bg-win-active-title text-white rounded-sm hover:opacity-90">Thanh toán</button>
          </div>
        </div>
      </WinDialog>
    </div>
  )
}
