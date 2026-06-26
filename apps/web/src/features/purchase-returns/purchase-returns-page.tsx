import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinDialog } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { usePurchaseReturns, useCreatePurchaseReturn, useSuppliers, useIngredients } from '@/data'
import { formatDateTime, formatCurrency } from '@wms/shared'
import type { PurchaseReturn } from '@/data/use-purchase-returns'

const columns: Column<PurchaseReturn>[] = [
  { key: 'code', header: 'Mã phiếu', width: 120 },
  { key: 'supplier', header: 'NCC', width: 150, render: (r) => r.supplier.name },
  { key: 'totalAmount', header: 'Tổng tiền', width: 120, align: 'right', render: (r) => formatCurrency(r.totalAmount) },
  { key: 'reason', header: 'Lý do', width: 200 },
  { key: 'createdAt', header: 'Ngày tạo', width: 150, render: (r) => formatDateTime(r.createdAt) },
]

interface ReturnItem {
  ingredientId: string
  quantity: number
  unitPrice: number
}

export function PurchaseReturnsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: res, isLoading, refetch } = usePurchaseReturns()
  const createMutation = useCreatePurchaseReturn()
  const { data: suppliersRes } = useSuppliers()
  const { data: ingredientsRes } = useIngredients()

  const [supplierId, setSupplierId] = useState('')
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<ReturnItem[]>([{ ingredientId: '', quantity: 0, unitPrice: 0 }])

  const resetForm = () => {
    setSupplierId('')
    setReason('')
    setItems([{ ingredientId: '', quantity: 0, unitPrice: 0 }])
  }

  const handleSubmit = async () => {
    const validItems = items.filter((i) => i.ingredientId && i.quantity > 0 && i.unitPrice > 0)
    if (!supplierId || !reason || validItems.length === 0) return
    await createMutation.mutateAsync({ supplierId, reason, items: validItems })
    setDialogOpen(false)
    resetForm()
  }

  const addItem = () => setItems([...items, { ingredientId: '', quantity: 0, unitPrice: 0 }])

  const updateItem = (idx: number, field: keyof ReturnItem, val: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)))
  }

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Tạo phiếu trả" onClick={() => setDialogOpen(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <WinDataGrid
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        storageKey="purchase-returns"
      />

      <WinDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Tạo phiếu trả hàng" width={600}>
        <div className="space-y-3 p-3">
          <div>
            <label className="text-[11px] block mb-0.5">Nhà cung cấp</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full border border-win-input-border rounded-sm px-2 py-1 text-[11px] outline-none bg-white"
            >
              <option value="">Chọn NCC</option>
              {suppliersRes?.data.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] block mb-0.5">Lý do</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-win-input-border rounded-sm px-2 py-1 text-[11px] outline-none bg-white"
            />
          </div>
          <div>
            <label className="text-[11px] block mb-1">Danh sách hàng trả</label>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-win-grid-header">
                  <th className="text-left p-1">Nguyên liệu</th>
                  <th className="p-1 w-20">SL</th>
                  <th className="p-1 w-24">Đơn giá</th>
                  <th className="p-1 w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-win-grid-border">
                    <td className="p-1">
                      <select
                        value={item.ingredientId}
                        onChange={(e) => updateItem(idx, 'ingredientId', e.target.value)}
                        className="w-full border border-win-input-border rounded-sm px-1 py-0.5 text-[11px] bg-white"
                      >
                        <option value="">Chọn NL</option>
                        {ingredientsRes?.data.map((ing) => (
                          <option key={ing.id} value={ing.id}>{ing.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-full border border-win-input-border rounded-sm px-1 py-0.5 text-[11px] text-right bg-white"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full border border-win-input-border rounded-sm px-1 py-0.5 text-[11px] text-right bg-white"
                      />
                    </td>
                    <td className="p-1">
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-win-error text-[11px]">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addItem} className="mt-1 text-[11px] text-win-active-title hover:underline">+ Thêm dòng</button>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-win-grid-border">
            <button onClick={() => setDialogOpen(false)} className="px-3 py-1 text-[11px] border border-win-grid-border rounded-sm hover:bg-win-menu-hover">Huỷ</button>
            <button onClick={handleSubmit} className="px-3 py-1 text-[11px] bg-win-active-title text-white rounded-sm hover:opacity-90">Tạo phiếu</button>
          </div>
        </div>
      </WinDialog>
    </div>
  )
}
