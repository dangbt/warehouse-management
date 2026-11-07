import { useState } from 'react'
import { Check, FilePlus2, FileSignature, RefreshCw, X } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useNavigate } from '@tanstack/react-router'
import { usePurchaseRequests, usePurchaseRequestAction, useCreatePurchaseOrdersFromRequest, type PurchaseRequest } from '@/data'
import { useAuthStore } from '@/stores/auth.store'
import { formatDate, formatCurrency, formatNumber } from '@wms/shared'
import { SuggestDialog } from './suggest-dialog'

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CONVERTED: 'Đã tách PO',
}

const columns: Column<PurchaseRequest>[] = [
  { key: 'code', header: 'Số đề nghị', width: 130 },
  { key: 'createdAt', header: 'Ngày lập', width: 110, align: 'center', render: (r) => formatDate(r.createdAt) },
  { key: 'items', header: 'Số dòng', width: 80, align: 'center', render: (r) => r.items.length },
  { key: 'orders', header: 'PO', width: 200, render: (r) => r.orders?.map((o) => o.code).join(', ') || '—' },
  { key: 'note', header: 'Diễn giải', width: 240, render: (r) => r.note || '' },
  { key: 'status', header: 'Trạng thái', width: 110, align: 'center', render: (r) => REQUEST_STATUS_LABELS[r.status] ?? r.status },
]

export function PurchaseRequestsPage() {
  const [selected, setSelected] = useState<PurchaseRequest | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const { data: res, isLoading, refetch } = usePurchaseRequests()
  const approve = usePurchaseRequestAction('approve')
  const reject = usePurchaseRequestAction('reject')
  const split = useCreatePurchaseOrdersFromRequest()
  const isDraft = selected?.status === 'DRAFT'

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        {hasPermission('purchase_requests:create') && (
          <WinToolbar.Button icon={<FilePlus2 size={16} />} label="Lập đề nghị từ tồn thấp" onClick={() => setSuggestOpen(true)} />
        )}
        <WinToolbar.Separator />
        {hasPermission('purchase_requests:approve') && (
          <>
            <WinToolbar.Button icon={<Check size={16} />} label="Duyệt" disabled={!isDraft} onClick={() => selected && approve.mutate(selected.id)} />
            <WinToolbar.Button icon={<X size={16} />} label="Từ chối" danger disabled={!isDraft} onClick={() => selected && reject.mutate(selected.id)} />
          </>
        )}
        {hasPermission('purchase_orders:create') && (
          <WinToolbar.Button
            icon={<FileSignature size={16} />}
            label="Tách PO theo NCC"
            disabled={selected?.status !== 'APPROVED'}
            onClick={() => selected && split.mutateAsync(selected.id).then(() => navigate({ to: '/purchase-orders' }))}
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
        storageKey="purchase-requests"
      />

      {selected && (
        <div className="border-t-2 border-win-grid-border bg-win-control p-3 max-h-72 overflow-auto shrink-0 text-[14px]">
          <div className="font-semibold mb-2">Đề nghị {selected.code}</div>
          <table className="w-full bg-white border border-win-grid-border">
            <thead>
              <tr className="bg-win-grid-header">
                <th className="text-left p-1.5">Nguyên liệu</th>
                <th className="text-center p-1.5">ĐVT</th>
                <th className="text-right p-1.5">SL</th>
                <th className="text-left p-1.5">NCC</th>
                <th className="text-right p-1.5">Đơn giá</th>
              </tr>
            </thead>
            <tbody>
              {selected.items.map((i) => (
                <tr key={i.id} className="border-t border-win-grid-border">
                  <td className="p-1.5">{i.ingredient.name}</td>
                  <td className="p-1.5 text-center">{i.ingredient.unit}</td>
                  <td className="p-1.5 text-right">{formatNumber(i.quantity)}</td>
                  <td className="p-1.5">{i.supplier?.name ?? '—'}</td>
                  <td className="p-1.5 text-right">{formatCurrency(i.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SuggestDialog
        open={suggestOpen}
        onClose={() => {
          setSuggestOpen(false)
          void refetch()
        }}
      />
    </div>
  )
}
