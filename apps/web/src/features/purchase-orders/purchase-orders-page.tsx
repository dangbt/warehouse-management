import { useState } from 'react'
import { Ban, PackagePlus, Printer, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { usePurchaseOrders, useCancelPurchaseOrder, useCreateImportOrder, fetchReceiptDraft, queryClient, QUERY_KEYS, type PurchaseOrder } from '@/data'
import { useAuthStore } from '@/stores/auth.store'
import { useToastStore } from '@/stores/toast.store'
import { formatDate, formatCurrency, formatNumber } from '@wms/shared'
import { ImportOrderForm, type ImportOrderInitial } from '@/features/import-orders/import-order-form'
import { printPurchaseOrder } from './po-print'

export const PO_STATUS_LABELS: Record<string, string> = {
  UNRECEIVED: 'Chưa nhận',
  PARTIAL: 'Nhận một phần',
  RECEIVED: 'Đã nhận đủ',
  CANCELLED: 'Huỷ',
}

const columns: Column<PurchaseOrder>[] = [
  { key: 'code', header: 'Số PO', width: 120 },
  { key: 'createdAt', header: 'Ngày lập', width: 110, align: 'center', render: (r) => formatDate(r.createdAt) },
  { key: 'supplier', header: 'NCC', width: 200, render: (r) => r.supplier?.name },
  { key: 'totalAmount', header: 'Tổng tiền', width: 130, align: 'right', render: (r) => formatCurrency(r.totalAmount) },
  { key: 'status', header: 'Trạng thái', width: 130, align: 'center', render: (r) => PO_STATUS_LABELS[r.status] ?? r.status },
]

export function PurchaseOrdersPage() {
  const [selected, setSelected] = useState<PurchaseOrder | null>(null)
  const [receipt, setReceipt] = useState<{ poId: string; initial: ImportOrderInitial } | null>(null)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const { data: res, isLoading, refetch } = usePurchaseOrders()
  const cancel = useCancelPurchaseOrder()
  const createImport = useCreateImportOrder()
  const canReceive = !!selected && (selected.status === 'UNRECEIVED' || selected.status === 'PARTIAL')

  const openReceipt = async () => {
    if (!selected) return
    try {
      const d = await fetchReceiptDraft(selected.id)
      setReceipt({
        poId: d.purchaseOrderId,
        initial: {
          supplierId: d.supplierId,
          note: `Nhập theo ${d.code}`,
          items: d.items.map((i) => ({ ingredientId: i.ingredientId, quantity: i.quantity, unitPrice: i.unitPrice })),
        },
      })
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : 'Không lập được phiếu nhập')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Printer size={16} />} label="In / PDF" disabled={!selected} onClick={() => selected && printPurchaseOrder(selected)} />
        {hasPermission('import_orders:create') && (
          <WinToolbar.Button icon={<PackagePlus size={16} />} label="Lập phiếu nhập" disabled={!canReceive} onClick={openReceipt} />
        )}
        {hasPermission('purchase_orders:update') && (
          <WinToolbar.Button
            icon={<Ban size={16} />}
            label="Huỷ PO"
            danger
            disabled={selected?.status !== 'UNRECEIVED'}
            onClick={() => selected && cancel.mutateAsync(selected.id).then(() => setSelected(null))}
          />
        )}
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={16} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>

      <WinDataGrid
        searchable
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page: 1, limit: 50, total: res?.meta.total ?? 0 }}
        onRowClick={setSelected}
        storageKey="purchase-orders"
      />

      {selected && (
        <div className="border-t-2 border-win-grid-border bg-win-control p-3 max-h-72 overflow-auto shrink-0 text-[14px]">
          <div className="font-semibold mb-2">
            {selected.code} · {selected.supplier?.name}
          </div>
          <table className="w-full bg-white border border-win-grid-border">
            <thead>
              <tr className="bg-win-grid-header">
                <th className="text-left p-1.5">Nguyên liệu</th>
                <th className="text-center p-1.5">ĐVT</th>
                <th className="text-right p-1.5">SL đặt</th>
                <th className="text-right p-1.5">Đã nhận</th>
                <th className="text-right p-1.5">Còn lại</th>
                <th className="text-right p-1.5">Đơn giá</th>
              </tr>
            </thead>
            <tbody>
              {selected.items.map((i) => (
                <tr key={i.id} className="border-t border-win-grid-border">
                  <td className="p-1.5">{i.ingredient.name}</td>
                  <td className="p-1.5 text-center">{i.ingredient.unit}</td>
                  <td className="p-1.5 text-right">{formatNumber(i.quantity)}</td>
                  <td className="p-1.5 text-right">{formatNumber(i.receivedQty)}</td>
                  <td className="p-1.5 text-right">{formatNumber(Math.max(0, Number(i.quantity) - Number(i.receivedQty)))}</td>
                  <td className="p-1.5 text-right">{formatCurrency(i.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ImportOrderForm
        open={!!receipt}
        initial={receipt?.initial}
        onClose={() => {
          setReceipt(null)
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseOrders })
        }}
        onSave={(data) => createImport.mutateAsync({ ...data, purchase_order_id: receipt?.poId })}
      />
    </div>
  )
}
