import { useState } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useIngredientUsage } from '@/data'
import type { IngredientUsageItem } from '@/data/use-ingredient-usage'
import { formatNumber } from '@wms/shared'

const columns: Column<IngredientUsageItem>[] = [
  { key: 'name', header: 'Nguyên liệu', width: 160 },
  { key: 'unit', header: 'ĐVT', width: 60, align: 'center' },
  { key: 'imported', header: 'Nhập', width: 90, align: 'right', render: (r) => <span className="text-green-700">{formatNumber(r.imported)}</span> },
  { key: 'exported', header: 'Xuất', width: 90, align: 'right', render: (r) => <span className="text-red-700">{formatNumber(r.exported)}</span> },
  { key: 'currentStock', header: 'Tồn kho', width: 90, align: 'right', render: (r) => formatNumber(r.currentStock) },
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

function UsageChart({ data }: { data: IngredientUsageItem[] }) {
  const chartData = data.slice(0, 10).map((d) => ({ name: d.name, Nhập: d.imported ?? 0, Xuất: d.exported ?? 0, 'Tồn kho': d.currentStock ?? 0 }))

  return (
    <div className="border-b border-win-grid-border bg-white p-3 h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Nhập" fill="#22c55e" radius={[2, 2, 0, 0]} />
          <Bar dataKey="Xuất" fill="#ef4444" radius={[2, 2, 0, 0]} />
          <Bar dataKey="Tồn kho" fill="#3b82f6" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function IngredientUsagePage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [offset, setOffset] = useState(0)

  const range = period === 'week' ? getWeekRange(offset) : getMonthRange(offset)
  const { data, isLoading, refetch } = useIngredientUsage({ period, from: range.from, to: range.to })

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
      {data && data.length > 0 && <UsageChart data={data} />}
      <WinDataGrid columns={columns} data={data ?? []} loading={isLoading} storageKey="ingredient-usage" />
    </div>
  )
}
