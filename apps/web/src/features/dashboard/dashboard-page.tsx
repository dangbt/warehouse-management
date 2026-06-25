import { useState, useEffect } from 'react'
import { Package, FileText, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react'
import { WinGroupBox } from '@wms/ui-winforms'
import { api } from '@/services/api'
import { formatDateTime } from '@wms/shared'

export function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, pending: 0, lowStock: 0, totalValue: 0 })
  const [lowStockItems, setLowStockItems] = useState<{ name: string; currentStock: string; minStock: string; unit: string }[]>([])
  const [recentMovements, setRecentMovements] = useState<{ id: string; createdAt: string; createdBy: { fullName: string }; type: string; quantity: string; ingredient: { name: string; unit: string } }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [summary, imports, movements] = await Promise.all([
        api.get('/reports/stock-summary'),
        api.get('/import-orders?status=PENDING&limit=5'),
        api.get('/reports/stock-movement'),
      ])
      setStats({ total: summary.total, pending: imports.meta.total, lowStock: summary.lowStock.length, totalValue: summary.totalValue })
      setLowStockItems(summary.lowStock.slice(0, 5))
      setRecentMovements(movements.slice(0, 8))
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const cards = [
    { label: 'Nguyên liệu', value: stats.total, icon: <Package size={20} />, color: 'text-win-active-title' },
    { label: 'Phiếu chờ duyệt', value: stats.pending, icon: <FileText size={20} />, color: 'text-win-warning' },
    { label: 'Tồn kho thấp', value: stats.lowStock, icon: <AlertTriangle size={20} />, color: 'text-win-error' },
    { label: 'Giá trị kho', value: `${(stats.totalValue / 1000000).toFixed(1)}M`, icon: <DollarSign size={20} />, color: 'text-win-success' },
  ]

  if (loading) return <div className="p-4 text-xs text-win-text-secondary">Đang tải...</div>

  return (
    <div className="p-4 overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">📊 Dashboard</h2>
        <button onClick={fetchData} className="flex items-center gap-1 text-[11px] text-win-active-title hover:underline cursor-pointer"><RefreshCw size={12} /> Refresh</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {cards.map((s) => (
          <div key={s.label} className="border border-win-grid-border bg-win-control rounded p-3 flex items-center gap-3">
            <div className={s.color}>{s.icon}</div>
            <div>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[11px] text-win-text-secondary">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Low Stock */}
        <WinGroupBox title="⚠️ Tồn kho thấp">
          {lowStockItems.length > 0 ? (
            <table className="w-full text-[11px]">
              <thead><tr className="bg-win-grid-header"><th className="text-left p-1">NL</th><th className="p-1">Tồn</th><th className="p-1">Min</th></tr></thead>
              <tbody>
                {lowStockItems.map((i) => (
                  <tr key={i.name} className="border-b border-win-grid-border text-win-error">
                    <td className="p-1">{i.name}</td>
                    <td className="p-1 text-center">{i.currentStock} {i.unit}</td>
                    <td className="p-1 text-center">{i.minStock} {i.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-[11px] text-win-success">✓ Tất cả nguyên liệu đủ stock</p>}
        </WinGroupBox>

        {/* Recent Activity */}
        <WinGroupBox title="🕒 Hoạt động gần đây">
          <div className="space-y-1">
            {recentMovements.map((t) => (
              <div key={t.id} className="flex gap-2 text-[11px]">
                <span className="text-win-text-secondary w-[110px] shrink-0">{formatDateTime(t.createdAt)}</span>
                <span>{t.createdBy.fullName} {t.type === 'IMPORT' ? '📥 nhập' : '📤 xuất'} {Math.abs(Number(t.quantity))} {t.ingredient.unit} {t.ingredient.name}</span>
              </div>
            ))}
            {recentMovements.length === 0 && <p className="text-[11px] text-win-text-secondary">Chưa có hoạt động</p>}
          </div>
        </WinGroupBox>
      </div>
    </div>
  )
}
