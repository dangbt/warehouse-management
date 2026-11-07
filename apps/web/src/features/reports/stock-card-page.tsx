import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { WinToolbar } from '@wms/ui-winforms'
import { useIngredients, useStockCard } from '@/data'
import { exportSheet } from '@/utils/excel'
import { Route } from '@/routes/_app/stock-card'
import { WarehouseSelect } from '@/components/warehouse-select'
import { fmtDisplay } from './inventory-summary-utils'
import { PeriodPicker, usePeriod } from './period-picker'
import { StockCardTable } from './stock-card-table'
import { buildStockCardRows, excelColumns } from './stock-card-utils'

const MODE_LABEL = { qty: 'Thẻ kho (số lượng)', value: 'Sổ chi tiết vật tư (SL + giá trị)' } as const

export function StockCardPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const initial = search.from && search.to ? { from: search.from, to: search.to } : undefined
  const period = usePeriod(initial)
  const { range, valid } = period
  const ingredientId = search.ingredientId ?? ''
  const setIngredientId = (v: string) => navigate({ search: (p) => ({ ...p, ingredientId: v || undefined }) })
  const mode = search.mode
  const [warehouseId, setWarehouseId] = useState('')
  const { data: ingRes } = useIngredients({ limit: 1000, orderBy: 'name', sort: 'asc' })
  const { data, isLoading, refetch } = useStockCard({ ingredientId, warehouseId: warehouseId || undefined, ...range }, valid)

  const periodLabel = `Từ ngày ${fmtDisplay(range.from)} đến ngày ${fmtDisplay(range.to)}`

  async function handleExport() {
    if (!data) return
    const { rows, totalRow } = buildStockCardRows(data, mode)
    await exportSheet({
      fileName: `${mode === 'qty' ? 'the-kho' : 'so-chi-tiet-vat-tu'}_${data.ingredient.code}_${range.from}_${range.to}`,
      title: mode === 'qty' ? 'THẺ KHO (S12-DN)' : 'SỔ CHI TIẾT VẬT LIỆU, DỤNG CỤ, SẢN PHẨM, HÀNG HOÁ (S10-DN)',
      headerLines: [`Tên vật tư: ${data.ingredient.name} (${data.ingredient.code})`, `Đơn vị tính: ${data.ingredient.unit}`, periodLabel],
      columns: excelColumns(mode),
      rows,
      totalRow,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <select className="text-win-base" value={mode} onChange={(e) => navigate({ search: (p) => ({ ...p, mode: e.target.value as 'qty' | 'value' }) })}>
          {(Object.keys(MODE_LABEL) as (keyof typeof MODE_LABEL)[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
        </select>
        <select className="text-win-base max-w-64" value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
          <option value="">— Chọn nguyên liệu —</option>
          {ingRes?.data.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <WarehouseSelect allowAll value={warehouseId} onChange={setWarehouseId} testId="filter-warehouse" />
        <WinToolbar.Separator />
        <PeriodPicker p={period} />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Button icon={<Download size={14} />} label="Xuất Excel" disabled={!data || !valid} onClick={handleExport} />
      </WinToolbar>
      {data && (
        <div className="px-2 py-1 text-win-base">
          <span className="font-medium">{data.ingredient.name}</span> ({data.ingredient.code}) — ĐVT: {data.ingredient.unit} — {periodLabel}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {!ingredientId ? <div className="p-3">Chọn nguyên liệu để xem</div>
          : !valid ? <div className="p-3">Khoảng ngày không hợp lệ</div>
          : isLoading || !data ? <div className="p-3">Đang tải...</div>
          : <StockCardTable card={data} mode={mode} />}
      </div>
    </div>
  )
}
