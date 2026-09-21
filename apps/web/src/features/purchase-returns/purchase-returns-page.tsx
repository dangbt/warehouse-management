import { useState, useMemo } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinDialog } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { usePurchaseReturns, useCreatePurchaseReturn, useSuppliers, useIngredients, useCompletedImportOrders } from '@/data'
import { formatDateTime, formatCurrency, formatNumber, VAT_RATES, VAT_RATE_LABELS } from '@wms/shared'
import type { VatRate } from '@wms/shared'
import type { PurchaseReturn } from '@/data/use-purchase-returns'
import { lineTotalPrice, computeLineVat, computeVatTotals } from '../import-orders/vat'

const columns: Column<PurchaseReturn>[] = [
  { key: 'code', header: 'Mã phiếu', width: 120 },
  { key: 'supplier', header: 'NCC', width: 150, render: (r) => r.supplier.name },
  {
    key: 'vatAmount',
    header: 'Tiền thuế',
    width: 110,
    align: 'right',
    render: (r) => (r.vatAmount != null ? formatCurrency(r.vatAmount) : '—'),
  },
  { key: 'totalAmount', header: 'Tổng tiền', width: 120, align: 'right', render: (r) => formatCurrency(r.totalAmount) },
  { key: 'reason', header: 'Lý do', width: 200 },
  { key: 'createdAt', header: 'Ngày tạo', width: 150, render: (r) => formatDateTime(r.createdAt) },
]

interface ReturnItem {
  ingredientId: string
  quantity: number
  unitPrice: number
  vatRate: string
}

const EMPTY_ITEM: ReturnItem = { ingredientId: '', quantity: 0, unitPrice: 0, vatRate: '' }

export function PurchaseReturnsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: res, isLoading, refetch } = usePurchaseReturns()
  const createMutation = useCreatePurchaseReturn()
  const { data: suppliersRes } = useSuppliers()
  const { data: ingredientsRes } = useIngredients()

  const [supplierId, setSupplierId] = useState('')
  const [importOrderId, setImportOrderId] = useState('')
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<ReturnItem[]>([{ ...EMPTY_ITEM }])

  const { data: importOrders } = useCompletedImportOrders(supplierId)
  const selectedImportOrder = useMemo(
    () => importOrders?.find((o) => o.id === importOrderId),
    [importOrders, importOrderId],
  )

  // Có gắn phiếu nhập gốc ⇒ hiển thị cột thuế; tổng gồm VAT.
  const hasInvoice = !!importOrderId
  const totals = useMemo(
    () =>
      computeVatTotals(
        items.map((i) => ({ quantity: i.quantity, unit_price: i.unitPrice, vat_rate: i.vatRate })),
        hasInvoice,
      ),
    [items, hasInvoice],
  )

  const resetForm = () => {
    setSupplierId('')
    setImportOrderId('')
    setReason('')
    setItems([{ ...EMPTY_ITEM }])
  }

  /** Thuế suất mặc định của nguyên liệu theo phiếu nhập gốc đang chọn. */
  const defaultVatFor = (ingredientId: string): string => {
    const line = selectedImportOrder?.items.find((i) => i.ingredientId === ingredientId)
    return line?.vatRate ?? ''
  }

  const handleSupplierChange = (val: string) => {
    setSupplierId(val)
    // Đổi NCC ⇒ bỏ phiếu nhập gốc + thuế suất đã điền.
    setImportOrderId('')
    setItems((prev) => prev.map((i) => ({ ...i, vatRate: '' })))
  }

  const handleImportOrderChange = (val: string) => {
    setImportOrderId(val)
    const order = importOrders?.find((o) => o.id === val)
    // Tự điền thuế suất mỗi dòng theo dòng cùng nguyên liệu của phiếu nhập.
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        vatRate: i.ingredientId ? order?.items.find((x) => x.ingredientId === i.ingredientId)?.vatRate ?? '' : '',
      })),
    )
  }

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }])

  const updateItem = (idx: number, field: keyof ReturnItem, val: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item
        const next = { ...item, [field]: val }
        // Chọn nguyên liệu khi đã có phiếu nhập gốc ⇒ tự điền thuế suất.
        if (field === 'ingredientId' && importOrderId) {
          next.vatRate = defaultVatFor(String(val))
        }
        return next
      }),
    )
  }

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    const validItems = items.filter((i) => i.ingredientId && i.quantity > 0 && i.unitPrice > 0)
    if (!supplierId || !reason || validItems.length === 0) return
    await createMutation.mutateAsync({
      supplierId,
      reason,
      importOrderId: importOrderId || undefined,
      items: validItems.map((i) => ({
        ingredientId: i.ingredientId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        vatRate: hasInvoice ? i.vatRate || undefined : undefined,
      })),
    })
    setDialogOpen(false)
    resetForm()
  }

  const vatRateOptions = VAT_RATES.map((r) => ({ value: r, label: VAT_RATE_LABELS[r] }))

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={16} />} label="Tạo phiếu trả" onClick={() => setDialogOpen(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={16} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <WinDataGrid searchable
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        storageKey="purchase-returns"
      />

      <WinDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Tạo phiếu trả hàng" width={hasInvoice ? 760 : 600}>
        <div className="space-y-3 p-3">
          <div>
            <label className="text-win-base block mb-0.5">Nhà cung cấp</label>
            <select
              value={supplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="w-full border border-win-input-border h-8 px-2 text-win-base outline-none bg-white"
            >
              <option value="">Chọn NCC</option>
              {suppliersRes?.data.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-win-base block mb-0.5">Theo phiếu nhập (tuỳ chọn)</label>
            <select
              value={importOrderId}
              onChange={(e) => handleImportOrderChange(e.target.value)}
              disabled={!supplierId}
              className="w-full border border-win-input-border h-8 px-2 text-win-base outline-none bg-white disabled:bg-win-control"
            >
              <option value="">Không theo phiếu nhập</option>
              {importOrders?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code}
                  {[o.invoiceSymbol, o.invoiceNo].filter(Boolean).length
                    ? ` · HĐ ${[o.invoiceSymbol, o.invoiceNo].filter(Boolean).join('/')}`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-win-base block mb-0.5">Lý do</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-win-input-border h-8 px-2 text-win-base outline-none bg-white"
            />
          </div>
          <div>
            <label className="text-win-base block mb-1">Danh sách hàng trả</label>
            <table className="w-full text-win-base">
              <thead>
                <tr className="bg-win-grid-header">
                  <th className="text-left p-1">Nguyên liệu</th>
                  <th className="p-1 w-20">SL</th>
                  <th className="p-1 w-24">Đơn giá</th>
                  {hasInvoice && <th className="p-1 w-24">Thuế suất</th>}
                  {hasInvoice && <th className="p-1 w-24">Tiền thuế</th>}
                  <th className="p-1 w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const total = lineTotalPrice({ quantity: item.quantity, unit_price: item.unitPrice })
                  return (
                    <tr key={idx} className="border-b border-win-grid-border">
                      <td className="p-1">
                        <select
                          value={item.ingredientId}
                          onChange={(e) => updateItem(idx, 'ingredientId', e.target.value)}
                          className="w-full border border-win-input-border h-8 px-2 text-win-base bg-white"
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
                          className="w-full border border-win-input-border h-8 px-2 text-win-base text-right bg-white"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="number"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full border border-win-input-border h-8 px-2 text-win-base text-right bg-white"
                        />
                      </td>
                      {hasInvoice && (
                        <td className="p-1">
                          <select
                            value={item.vatRate}
                            onChange={(e) => updateItem(idx, 'vatRate', e.target.value)}
                            className="w-full border border-win-input-border h-8 px-2 text-win-base bg-white"
                          >
                            <option value="">—</option>
                            {vatRateOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                      )}
                      {hasInvoice && (
                        <td className="p-1 text-right pr-2">
                          {formatNumber(computeLineVat(total, (item.vatRate as VatRate) || null))}
                        </td>
                      )}
                      <td className="p-1">
                        {items.length > 1 && (
                          <button onClick={() => removeItem(idx)} className="text-win-error text-win-base">✕</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button onClick={addItem} className="mt-1 text-win-base text-win-active-title hover:underline">+ Thêm dòng</button>
          </div>
          <div className="flex flex-col items-end gap-0.5 pt-2 border-t border-win-grid-border text-win-base">
            <div className="flex gap-4">
              <span className="text-win-text-secondary">Tiền hàng:</span>
              <span className="font-semibold w-32 text-right">{formatNumber(totals.subtotal)}</span>
            </div>
            {hasInvoice && (
              <div className="flex gap-4">
                <span className="text-win-text-secondary">Tiền thuế GTGT:</span>
                <span className="font-semibold w-32 text-right">{formatNumber(totals.vatAmount)}</span>
              </div>
            )}
            <div className="flex gap-4">
              <span className="text-win-text-secondary">Tổng thanh toán:</span>
              <span className="font-bold w-32 text-right">{formatCurrency(totals.totalAmount)}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDialogOpen(false)} className="px-3 py-1 text-win-base border border-win-grid-border hover:bg-win-menu-hover">Huỷ</button>
            <button onClick={handleSubmit} className="px-3 py-1 text-win-base bg-win-active-title text-white hover:opacity-90">Tạo phiếu</button>
          </div>
        </div>
      </WinDialog>
    </div>
  )
}
