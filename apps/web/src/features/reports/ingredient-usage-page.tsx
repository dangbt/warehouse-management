import { useState } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useIngredientUsage } from '@/data'
import type { IngredientUsageItem } from '@/data/use-ingredient-usage'

const columns: Column<IngredientUsageItem>[] = [
  { key: 'name', header: 'Nguyên liệu', width: 160 },
  { key: 'unit', header: 'ĐVT', width: 60, align: 'center' },
  { key: 'imported', header: 'Nhập', width: 90, align: 'right', render: (r) => <span className="text-green-700">{(r.imported ?? 0).toLocaleString()}</span> },
  { key: 'exported', header: 'Xuất', width: 90, align: 'right', render: (r) => <span className="text-red-700">{(r.exported ?? 0).toLocaleString()}</span> },
  { key: 'currentStock', header: 'Tồn kho', width: 90, align: 'right', render: (r) => (r.currentStock ?? 0).toLocaleString() },
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

function BarChart({ data }: { data: IngredientUsageItem[] }) {
  const top = data.slice(0, 10)
  const maxVal = Math.max(...top.map((d) => Math.max(d.imported ?? 0, d.exported ?? 0, d.currentStock ?? 0)), 1)

  return (
    <div className="p-3 border-b border-win-grid-border bg-white overflow-x-auto">
      <div className="flex items-end gap-3 h-40 min-w-[600px]">
        {top.map((item) => (
          <div key={item.id} className="flex flex-col items-center flex-1 min-w-[50px]">
            <div className="flex items-end gap-0.5 h-28 w-full justify-center">
              <div
                className="bg-green-500 w-3 rounded-t-sm"
                style={{ height: `${((item.imported ?? 0) / maxVal) * 100}%` }}
                title={`Nhập: ${item.imported ?? 0}`}
              />
              <div
                className="bg-red-500 w-3 rounded-t-sm"
                style={{ height: `${((item.exported ?? 0) / maxVal) * 100}%` }}
                title={`Xuất: ${item.exported ?? 0}`}
              />
              <div
                className="bg-blue-500 w-3 rounded-t-sm"
                style={{ height: `${((item.currentStock ?? 0) / maxVal) * 100}%` }}
                title={`Tồn: ${item.currentStock ?? 0}`}
              />
            </div>
            <span className="text-[9px] text-center mt-1 leading-tight truncate w-full">{item.name}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 justify-center mt-2 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-sm" /> Nhập</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-sm" /> Xuất</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm" /> Tồn kho</span>
      </div>
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
      {data && data.length > 0 && <BarChart data={data} />}
      <WinDataGrid columns={columns} data={data ?? []} loading={isLoading} />
    </div>
  )
}
