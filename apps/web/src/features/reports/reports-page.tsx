import { useState } from 'react'
import { RefreshCw, ChevronRight, ChevronDown } from 'lucide-react'
import { WinToolbar, WinGroupBox } from '@wms/ui-winforms'
import { useStockSummary, useStockMovement } from '@/data'
import type { StockGroup } from '@/data/use-reports'
import { formatDateTime, formatCurrency, formatNumber } from '@wms/shared'

function GroupRow({ g }: { g: StockGroup }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr className={`border-b border-win-grid-border cursor-pointer hover:bg-win-menu-hover ${g.isLow ? 'text-win-error' : ''}`} onClick={() => setOpen((o) => !o)}>
        <td className="p-1">
          <span className="inline-flex items-center gap-1 font-semibold">
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {g.name}
          </span>
        </td>
        <td className="p-1 text-right font-bold">
          {formatNumber(g.totalStock)} {g.baseUnit}
          {g.isLow ? ' ⚠️' : ''}
        </td>
        <td className="p-1 text-center">{g.minStock != null ? `${formatNumber(g.minStock)} ${g.baseUnit}` : '-'}</td>
        <td className="p-1 text-right">{formatCurrency(g.totalValue)}</td>
      </tr>
      {open &&
        g.items.map((m) => (
          <tr key={m.id} className="border-b border-win-grid-border bg-win-grid-row-alt text-win-text-secondary">
            <td className="p-1 pl-6">
              {m.name} <span className="opacity-60">({formatNumber(m.currentStock)} {m.unit} × {m.baseFactor})</span>
            </td>
            <td className="p-1 text-right">
              {formatNumber(m.baseQty)} {g.baseUnit}
            </td>
            <td className="p-1"></td>
            <td className="p-1 text-right">{formatCurrency(m.value)}</td>
          </tr>
        ))}
    </>
  )
}

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
            <div className="text-lg font-bold text-win-success">{formatCurrency(summary?.totalValue)}</div>
            <div className="text-[11px] text-win-text-secondary">Giá trị kho</div>
          </div>
        </div>

        {summary && summary.groups?.length > 0 && (
          <WinGroupBox title="📦 Tồn kho theo nhóm (tự quy đổi về đơn vị gốc)">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-win-grid-header">
                  <th className="text-left p-1">Nhóm / Nguyên liệu</th>
                  <th className="text-right p-1">Tồn (quy đổi)</th>
                  <th className="text-center p-1">Min nhóm</th>
                  <th className="text-right p-1">Giá trị</th>
                </tr>
              </thead>
              <tbody>
                {summary.groups.map((g) => (
                  <GroupRow key={g.id} g={g} />
                ))}
              </tbody>
            </table>
          </WinGroupBox>
        )}

        {summary && summary.lowStock.length > 0 && (
          <WinGroupBox title="⚠️ Cảnh báo tồn kho thấp">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-win-grid-header">
                  <th className="text-left p-1">Nguyên liệu</th>
                  <th className="p-1">Tồn</th>
                  <th className="p-1">Min</th>
                  <th className="p-1">Thiếu</th>
                </tr>
              </thead>
              <tbody>
                {summary.lowStock.map((r) => (
                  <tr key={r.name} className="border-b border-win-grid-border text-win-error">
                    <td className="p-1">{r.name}</td>
                    <td className="p-1 text-center">
                      {r.currentStock} {r.unit}
                    </td>
                    <td className="p-1 text-center">
                      {r.minStock} {r.unit}
                    </td>
                    <td className="p-1 text-center font-bold">
                      {(Number(r.minStock) - Number(r.currentStock)).toFixed(1)} {r.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </WinGroupBox>
        )}

        <WinGroupBox title="📈 Biến động kho gần đây">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-win-grid-header">
                <th className="text-left p-1">Thời gian</th>
                <th className="text-left p-1">NL</th>
                <th className="text-center p-1">Loại</th>
                <th className="text-right p-1">SL</th>
                <th className="text-left p-1">Người</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(movements) ? movements : []).map((t) => {
                const typeMap: Record<string, { label: string; color: string }> = {
                  IMPORT: { label: '📥 Nhập', color: 'text-green-700 bg-green-50' },
                  EXPORT: { label: '📤 Xuất', color: 'text-red-700 bg-red-50' },
                  ORDER_DEDUCT: { label: '🍳 Trừ kho', color: 'text-orange-700 bg-orange-50' },
                  ORDER_RESTORE: { label: '↩️ Hoàn', color: 'text-blue-700 bg-blue-50' },
                  PROCESS_OUT: { label: '🔪 Chế biến (trừ)', color: 'text-orange-700 bg-orange-50' },
                  PROCESS_IN: { label: '🍲 Chế biến (thu)', color: 'text-green-700 bg-green-50' },
                  RETURN: { label: '↩️ Trả NCC', color: 'text-red-700 bg-red-50' },
                  STOCKTAKE_ADJUST: { label: '📋 Kiểm kê', color: 'text-purple-700 bg-purple-50' },
                }
                const typeInfo = typeMap[t.type] ?? { label: t.type, color: '' }
                return (
                  <tr key={t.id} className="border-b border-win-grid-border">
                    <td className="p-1">{formatDateTime(t.createdAt)}</td>
                    <td className="p-1">{t.ingredient.name}</td>
                    <td className="p-1 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="p-1 text-right font-mono">
                      {Number(t.quantity) > 0 ? '+' : ''}
                      {formatNumber(t.quantity)} {t.ingredient.unit}
                    </td>
                    <td className="p-1">{t.createdBy.fullName}</td>
                  </tr>
                )
              })}
              {!movements?.length && (
                <tr>
                  <td colSpan={5} className="p-2 text-center text-win-text-secondary">
                    Chưa có biến động
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </WinGroupBox>
      </div>
    </div>
  )
}
