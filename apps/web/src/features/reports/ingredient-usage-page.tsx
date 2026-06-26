import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useIngredientUsage } from '@/data'
import type { IngredientUsageItem } from '@/data/use-ingredient-usage'

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
] as const

const columns: Column<IngredientUsageItem>[] = [
  { key: 'name', header: 'Nguyên liệu', width: 200 },
  { key: 'unit', header: 'ĐVT', width: 80, align: 'center' },
  { key: 'total', header: 'Tổng sử dụng', width: 120, align: 'right', render: (r) => r.total.toLocaleString() },
]

export function IngredientUsagePage() {
  const [period, setPeriod] = useState<string>('week')
  const { data, isLoading, refetch } = useIngredientUsage({ period })

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        {PERIOD_OPTIONS.map((opt) => (
          <WinToolbar.Button
            key={opt.value}
            label={opt.label}
            active={period === opt.value}
            onClick={() => setPeriod(opt.value)}
          />
        ))}
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <WinDataGrid columns={columns} data={data ?? []} loading={isLoading} />
    </div>
  )
}
