import { useState } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useIngredientUsage } from '@/data'
import type { IngredientUsageItem } from '@/data/use-ingredient-usage'

const columns: Column<IngredientUsageItem>[] = [
  { key: 'name', header: 'Nguyên liệu', width: 200 },
  { key: 'unit', header: 'ĐVT', width: 80, align: 'center' },
  { key: 'total', header: 'Tổng sử dụng', width: 120, align: 'right', render: (r) => r.total.toLocaleString() },
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
      <WinDataGrid columns={columns} data={data ?? []} loading={isLoading} />
    </div>
  )
}
