import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { WinToolbar } from '@wms/ui-winforms'
import { useIngredientGroups, useInventorySummary } from '@/data'
import { exportSheet } from '@/utils/excel'
import { useNavigate } from '@tanstack/react-router'
import { InventorySummaryTable } from './inventory-summary-table'
import { EXCEL_COLUMNS, buildExcelRows, fmtDisplay } from './inventory-summary-utils'
import { PeriodPicker, usePeriod } from './period-picker'


export function InventorySummaryPage() {
  const navigate = useNavigate()
  const period = usePeriod()
  const { range, valid } = period
  const [groupId, setGroupId] = useState('')
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
        <PeriodPicker p={period} />
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
          : data && data.groups.length > 0 ? <InventorySummaryTable
            report={data}
            onRowOpen={(ingredientId) => navigate({ to: '/stock-card', search: { ingredientId, from: range.from, to: range.to, mode: 'qty' } })}
          />
          : <div className="p-3">Không có phát sinh trong kỳ</div>}
      </div>
      {data && <div className="px-2 py-1 text-xs text-win-text-muted">{data.valueNote}</div>}
    </div>
  )
}
