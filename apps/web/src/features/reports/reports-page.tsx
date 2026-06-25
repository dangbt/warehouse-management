import { RefreshCw } from 'lucide-react'
import { WinToolbar, WinGroupBox } from '@wms/ui-winforms'
import { useStockSummary, useStockMovement } from '@/data'
import { formatDateTime } from '@wms/shared'

export function ReportsPage() {
  const { data: summary, isLoading, refetch } = useStockSummary()
  const { data: movements } = useStockMovement()

  if (isLoading) return <div className="p-4 text-xs text-win-text-secondary">Đang tải...</div>

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <div className="p-4 overflow-auto space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-win-grid-border bg-win-control rounded p-3 text-center">
            <div className="text-lg font-bold">{summary?.total}</div>
            <div className="text-[11px] text-win-text-secondary">Nguyên liệu</div>
          </div>
          <div className="border border-win-grid-border bg-win-control rounded p-3 text-center">
            <div className="text-lg font-bold text-win-error">{summary?.lowStock.length}</div>
            <div className="text-[11px] text-win-text-secondary">Tồn kho thấp</div>
          </div>
          <div className="border border-win-grid-border bg-win-control rounded p-3 text-center">
            <div className="text-lg font-bold text-win-success">{summary?.totalValue.toLocaleString()}₫</div>
            <div className="text-[11px] text-win-text-secondary">Giá trị kho</div>
          </div>
        </div>

        {summary && summary.lowStock.length > 0 && (
          <WinGroupBox title="⚠️ Cảnh báo tồn kho thấp">
            <table className="w-full text-[11px]">
              <thead><tr className="bg-win-grid-header"><th className="text-left p-1">Nguyên liệu</th><th className="p-1">Tồn</th><th className="p-1">Min</th><th className="p-1">Thiếu</th></tr></thead>
              <tbody>
                {summary.lowStock.map((r) => (
                  <tr key={r.name} className="border-b border-win-grid-border text-win-error">
                    <td className="p-1">{r.name}</td>
                    <td className="p-1 text-center">{r.currentStock} {r.unit}</td>
                    <td className="p-1 text-center">{r.minStock} {r.unit}</td>
                    <td className="p-1 text-center font-bold">{(Number(r.minStock) - Number(r.currentStock)).toFixed(1)} {r.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </WinGroupBox>
        )}

        <WinGroupBox title="📈 Biến động kho gần đây">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-win-grid-header"><th className="text-left p-1">Thời gian</th><th className="p-1">NL</th><th className="p-1">Loại</th><th className="p-1">SL</th><th className="p-1">Người</th></tr></thead>
            <tbody>
              {(movements ?? []).map((t: any) => (
                <tr key={t.id} className="border-b border-win-grid-border">
                  <td className="p-1">{formatDateTime(t.createdAt)}</td>
                  <td className="p-1">{t.ingredient.name}</td>
                  <td className="p-1">{t.type === 'IMPORT' ? '📥 Nhập' : '📤 Xuất'}</td>
                  <td className="p-1 text-right">{Number(t.quantity) > 0 ? '+' : ''}{t.quantity} {t.ingredient.unit}</td>
                  <td className="p-1">{t.createdBy.fullName}</td>
                </tr>
              ))}
              {!movements?.length && <tr><td colSpan={5} className="p-2 text-center text-win-text-secondary">Chưa có biến động</td></tr>}
            </tbody>
          </table>
        </WinGroupBox>
      </div>
    </div>
  )
}
