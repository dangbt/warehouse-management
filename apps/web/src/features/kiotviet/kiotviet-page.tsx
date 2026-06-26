import { useRef, useState } from 'react'
import { RefreshCw, Upload, MinusCircle } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useKiotVietOrders, useSyncKiotViet, useDeductOrder } from '@/data'
import { formatDate } from '@wms/shared'
import type { KiotVietOrder } from '@/data/use-kiotviet'

const columns: Column<KiotVietOrder>[] = [
  { key: 'code', header: 'Mã đơn', width: 120 },
  { key: 'customerName', header: 'Khách hàng', width: 160 },
  { key: 'totalAmount', header: 'Tổng tiền', width: 100, align: 'right', render: (r) => Number(r.totalAmount ?? 0).toLocaleString() },
  { key: 'items', header: 'SP', width: 50, align: 'center', render: (r) => String(r.items?.length ?? 0) },
  { key: 'orderDate', header: 'Ngày đặt', width: 100, align: 'center', render: (r) => formatDate(r.orderDate) },
  {
    key: 'deducted',
    header: 'Trạng thái',
    width: 100,
    align: 'center',
    render: (r) =>
      r.deducted ? (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-green-700 bg-green-50">Đã trừ</span>
      ) : (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-orange-700 bg-orange-50">Chưa trừ</span>
      ),
  },
]

export function KiotVietPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: res, isLoading, refetch } = useKiotVietOrders()
  const syncMutation = useSyncKiotViet()
  const deductMutation = useDeductOrder()

  const selectedOrder = res?.data?.find((o) => o.id === selectedId)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const orders = JSON.parse(ev.target?.result as string)
        syncMutation.mutate(Array.isArray(orders) ? orders : [orders])
      } catch {
        // invalid JSON handled by mutation error
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button
          icon={<Upload size={14} />}
          label="Sync"
          onClick={() => fileInputRef.current?.click()}
          disabled={syncMutation.isPending}
        />
        <WinToolbar.Button
          icon={<MinusCircle size={14} />}
          label="Trừ kho"
          onClick={() => {
            if (selectedOrder && !selectedOrder.deducted) {
              deductMutation.mutateAsync(selectedOrder.id)
            }
          }}
          disabled={!selectedOrder || selectedOrder.deducted || deductMutation.isPending}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      <WinDataGrid
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        selectedId={selectedId}
        onRowClick={(row) => setSelectedId(row.id)}
        pagination={{ page: 1, limit: 20, total: res?.meta?.total ?? 0 }}
        storageKey="kiotviet"
      />
    </div>
  )
}
