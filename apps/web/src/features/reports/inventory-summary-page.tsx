import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { WinToolbar } from '@wms/ui-winforms'
import { useIngredientGroups, useInventorySummary } from '@/data'
import { exportSheet } from '@/utils/excel'
import { InventorySummaryTable } from './inventory-summary-table'
import { EXCEL_COLUMNS, buildExcelRows, fmtDisplay, periodRange, type PeriodKind } from './inventory-summary-utils'

const KIND_LABEL: Record<PeriodKind, string> = { month: 'Tháng', quarter: 'Quý', year: 'Năm', custom: 'Tuỳ chọn' }
const today = new Date()

export function InventorySummaryPage() {
  const [kind, setKind] = useState<PeriodKind>('month')
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [quarter, setQuarter] = useState(Math.floor(today.getMonth() / 3) + 1)
  const [customFrom, setCustomFrom] = useState(periodRange('month', year, month).from)
  const [customTo, setCustomTo] = useState(periodRange('month', year, month).to)
  const [groupId, setGroupId] = useState('')

  const range =
    kind === 'custom' ? { from: customFrom, to: customTo } : periodRange(kind, year, kind === 'month' ? month : quarter)
  const valid = !!range.from && !!range.to && range.from <= range.to
  const { data: groups } = useIngredientGroups()
  const { data, isLoading, refetch } = useInventorySummary({ ...range, groupId: groupId || undefined })

  const periodLabel = `Từ ngày ${fmtDisplay(range.from)} đến ngày ${fmtDisplay(range.to)}`

  async function handleExport() {
    if (!data) return
    const { rows, totalRow } = buildExcelRows(data)
    const groupName = groups?.find((g) => g.id === groupId)?.name
    await exportSheet({
      fileName: `nhap-xuat-ton_${range.from}_${range.to}`,
      title: 'TỔNG HỢP NHẬP – XUẤT – TỒN NGUYÊN LIỆU',
      headerLines: [periodLabel, ...(groupName ? [`Nhóm: ${groupName}`] : []), `Ghi chú: ${data.valueNote}`],
      columns: EXCEL_COLUMNS,
      rows,
      totalRow,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <select className="text-win-base" value={kind} onChange={(e) => setKind(e.target.value as PeriodKind)}>
          {(Object.keys(KIND_LABEL) as PeriodKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        {kind === 'month' && (
          <select className="text-win-base" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
          </select>
        )}
        {kind === 'quarter' && (
          <select className="text-win-base" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
            {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Quý {q}</option>)}
          </select>
        )}
        {kind !== 'custom' ? (
          <input type="number" className="text-win-base w-20" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />
        ) : (
          <>
            <input type="date" className="text-win-base" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span>–</span>
            <input type="date" className="text-win-base" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </>
        )}
        <WinToolbar.Separator />
        <select className="text-win-base" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Tất cả nhóm</option>
          {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Button icon={<Download size={14} />} label="Xuất Excel" disabled={!data || !valid} onClick={handleExport} />
      </WinToolbar>
      <div className="px-2 py-1 text-win-base font-medium">{periodLabel}</div>
      <div className="flex-1 overflow-auto">
        {!valid ? <div className="p-3">Khoảng ngày không hợp lệ</div>
          : isLoading ? <div className="p-3">Đang tải...</div>
          : data && data.groups.length > 0 ? <InventorySummaryTable report={data} />
          : <div className="p-3">Không có phát sinh trong kỳ</div>}
      </div>
      {data && <div className="px-2 py-1 text-xs text-win-text-muted">{data.valueNote}</div>}
    </div>
  )
}
