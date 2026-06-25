import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { WinToolbar, WinGroupBox } from '@wms/ui-winforms'
import { api } from '@/services/api'
import { formatDateTime } from '@wms/shared'

interface Ingredient { name: string; unit: string; currentStock: string; minStock: string; costPerUnit: string }
interface Transaction { id: string; ingredient: { name: string; unit: string }; type: string; quantity: string; note: string; createdBy: { fullName: string }; createdAt: string }

export function ReportsPage() {
  const [summary, setSummary] = useState<{ total: number; totalValue: number; lowStock: Ingredient[]; ingredients: Ingredient[] } | null>(null)
  const [movements, setMovements] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const [sum, mov] = await Promise.all([api.get('/reports/stock-summary'), api.get('/reports/stock-movement')])
    setSummary(sum)
    setMovements(mov)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div className="p-4 text-xs text-win-text-secondary">Đang tải...</div>

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={fetchData} />
      </WinToolbar>

      <div className="p-4 overflow-auto space-y-3">
        {/* Summary */}
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

        {/* Low Stock */}
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

        {/* Stock Movement */}
        <WinGroupBox title="📈 Biến động kho gần đây">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-win-grid-header"><th className="text-left p-1">Thời gian</th><th className="p-1">NL</th><th className="p-1">Loại</th><th className="p-1">SL</th><th className="p-1">Người</th><th className="p-1">Ghi chú</th></tr></thead>
            <tbody>
              {movements.map((t) => (
                <tr key={t.id} className="border-b border-win-grid-border">
                  <td className="p-1">{formatDateTime(t.createdAt)}</td>
                  <td className="p-1">{t.ingredient.name}</td>
                  <td className="p-1"><TypeBadge type={t.type} /></td>
                  <td className="p-1 text-right">{Number(t.quantity) > 0 ? '+' : ''}{t.quantity} {t.ingredient.unit}</td>
                  <td className="p-1">{t.createdBy.fullName}</td>
                  <td className="p-1 text-win-text-secondary">{t.note}</td>
                </tr>
              ))}
              {movements.length === 0 && <tr><td colSpan={6} className="p-2 text-center text-win-text-secondary">Chưa có biến động</td></tr>}
            </tbody>
          </table>
        </WinGroupBox>
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = { IMPORT: 'bg-green-100 text-green-800', EXPORT: 'bg-red-100 text-red-800', ORDER_DEDUCT: 'bg-orange-100 text-orange-800', ORDER_RESTORE: 'bg-blue-100 text-blue-800' }
  const labels: Record<string, string> = { IMPORT: 'Nhập', EXPORT: 'Xuất', ORDER_DEDUCT: 'Trừ kho', ORDER_RESTORE: 'Hoàn' }
  return <span className={`px-1.5 py-0.5 rounded text-[10px] ${colors[type] || 'bg-gray-100'}`}>{labels[type] || type}</span>
}
