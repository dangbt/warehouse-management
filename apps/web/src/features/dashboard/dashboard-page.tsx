import { Package, FileText, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react'
import { WinGroupBox } from '@wms/ui-winforms'
import { useStockSummary, useStockMovement, useImportOrders, useExpiringBatches } from '@/data'
import { formatDateTime, formatDate } from '@wms/shared'

export function DashboardPage() {
  const { data: summary, refetch: refetchSummary } = useStockSummary()
  const { data: movements } = useStockMovement()
  const { data: pendingOrders } = useImportOrders({ status: 'PENDING' })
  const { data: expiringBatches } = useExpiringBatches(7)

  const cards = [
    { label: 'Nguyên liệu', value: summary?.total ?? 0, icon: <Package size={20} />, color: 'text-win-active-title' },
    {
      label: 'Phiếu chờ duyệt',
      value: pendingOrders?.meta.total ?? 0,
      icon: <FileText size={20} />,
      color: 'text-win-warning',
    },
    {
      label: 'Tồn kho thấp',
      value: summary?.lowStock.length ?? 0,
      icon: <AlertTriangle size={20} />,
      color: 'text-win-error',
    },
    {
      label: 'Giá trị kho',
      value: `${((summary?.totalValue ?? 0) / 1000000).toFixed(1)}M`,
      icon: <DollarSign size={20} />,
      color: 'text-win-success',
    },
  ]

  return (
    <div className="p-4 overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">📊 Dashboard</h2>
        <button
          onClick={() => refetchSummary()}
          className="flex items-center gap-1 text-[11px] text-win-active-title hover:underline cursor-pointer"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {cards.map((s) => (
          <div
            key={s.label}
            className="border border-win-grid-border bg-win-control rounded p-3 flex items-center gap-3"
          >
            <div className={s.color}>{s.icon}</div>
            <div>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[11px] text-win-text-secondary">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <WinGroupBox title="⚠️ Tồn kho thấp">
          {summary?.lowStock.length ? (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-win-grid-header">
                  <th className="text-left p-1">NL</th>
                  <th className="p-1">Tồn</th>
                  <th className="p-1">Min</th>
                </tr>
              </thead>
              <tbody>
                {summary.lowStock.slice(0, 5).map((i) => (
                  <tr key={i.name} className="border-b border-win-grid-border text-win-error">
                    <td className="p-1">{i.name}</td>
                    <td className="p-1 text-center">
                      {i.currentStock} {i.unit}
                    </td>
                    <td className="p-1 text-center">
                      {i.minStock} {i.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[11px] text-win-success">✓ Tất cả đủ stock</p>
          )}
        </WinGroupBox>

        <WinGroupBox title="🕒 Hoạt động gần đây">
          <div className="space-y-1">
            {(movements ?? []).slice(0, 8).map((t: any) => (
              <div key={t.id} className="flex gap-2 text-[11px]">
                <span className="text-win-text-secondary w-[110px] shrink-0">{formatDateTime(t.createdAt)}</span>
                <span>
                  {t.createdBy.fullName} {t.type === 'IMPORT' ? '📥' : '📤'} {Math.abs(Number(t.quantity))}{' '}
                  {t.ingredient.unit} {t.ingredient.name}
                </span>
              </div>
            ))}
            {!movements?.length && <p className="text-[11px] text-win-text-secondary">Chưa có hoạt động</p>}
          </div>
        </WinGroupBox>
      </div>

      <div className="mt-3">
        <WinGroupBox title="⏰ Lô hàng sắp hết hạn (7 ngày)">
          {expiringBatches?.length ? (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-win-grid-header">
                  <th className="text-left p-1">Mã lô</th>
                  <th className="text-left p-1">Nguyên liệu</th>
                  <th className="p-1">Số lượng</th>
                  <th className="p-1">HSD</th>
                  <th className="p-1">Còn</th>
                </tr>
              </thead>
              <tbody>
                {expiringBatches.slice(0, 10).map((b) => (
                  <tr key={b.id} className="border-b border-win-grid-border text-win-error">
                    <td className="p-1">{b.batchCode}</td>
                    <td className="p-1">{b.ingredient.name}</td>
                    <td className="p-1 text-center">{b.quantity} {b.ingredient.unit}</td>
                    <td className="p-1 text-center">{formatDate(b.expiryDate)}</td>
                    <td className="p-1 text-center font-bold">{b.daysUntilExpiry} ngày</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[11px] text-win-success">✓ Không có lô sắp hết hạn</p>
          )}
        </WinGroupBox>
      </div>
    </div>
  )
}
