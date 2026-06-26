import { useState } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useConsumptionVariance } from '@/data'
import type { VarianceItem } from '@/data/use-variance'
import { formatNumber } from '@wms/shared'

const columns: Column<VarianceItem>[] = [
  { key: 'name', header: 'Nguyên liệu', width: 160 },
  { key: 'unit', header: 'ĐVT', width: 60, align: 'center' },
  { key: 'theoreticalUsage', header: 'Lý thuyết', width: 100, align: 'right', render: (r) => formatNumber(r.theoreticalUsage) },
  { key: 'actualUsage', header: 'Thực tế', width: 100, align: 'right', render: (r) => formatNumber(r.actualUsage) },
  { key: 'variance', header: 'Chênh lệch', width: 100, align: 'right', render: (r) => {
    const v = r.variance ?? 0
    const cls = v > 0 ? 'text-win-error' : v < 0 ? 'text-green-700' : ''
    return <span className={cls}>{v > 0 ? `+${formatNumber(v)}` : formatNumber(v)}</span>
  }},
  { key: 'variancePercent', header: '% Lệch', width: 80, align: 'right', render: (r) => {
    const p = r.variancePercent ?? 0
    const cls = Math.abs(p) > 10 ? 'text-win-error font-bold' : ''
    return <span className={cls}>{p.toFixed(1)}%</span>
  }},
]

function getWeekRange(offset: number) {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1 + offset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { from: fmt(monday), to: fmt(sunday) }
}

function getMonthRange(offset: number) {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { from: fmt(first), to: fmt(last) }
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10)
}

function fmtDisplay(d: string) {
  return d.split('-').reverse().join('/')
}

export function VarianceReportPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [offset, setOffset] = useState(0)

  const range = period === 'week' ? getWeekRange(offset) : getMonthRange(offset)
  const { data, isLoading, refetch } = useConsumptionVariance({ from: range.from, to: range.to })

  const label = `${fmtDisplay(range.from)} - ${fmtDisplay(range.to)}`

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button label="Tuần" active={period === 'week'} onClick={() => { setPeriod('week'); setOffset(0) }} />
        <WinToolbar.Button label="Tháng" active={period === 'month'} onClick={() => { setPeriod('month'); setOffset(0) }} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<ChevronLeft size={14} />} onClick={() => setOffset(offset - 1)} />
        <span className="text-[11px] px-2 font-medium">{label}</span>
        <WinToolbar.Button icon={<ChevronRight size={14} />} disabled={offset >= 0} onClick={() => setOffset(offset + 1)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <WinDataGrid
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        storageKey="variance-report"
      />
    </div>
  )
}
