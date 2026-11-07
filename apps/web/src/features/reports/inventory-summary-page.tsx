import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { WinToolbar } from '@wms/ui-winforms'
import { useIngredientGroups, useInventorySummary } from '@/data'
import { useProductAttributes, useProducts } from '@/data/use-products'
import { useFeatures } from '@/data/use-features'
import { exportSheet } from '@/utils/excel'
import { useNavigate } from '@tanstack/react-router'
import { WarehouseSelect } from '@/components/warehouse-select'
import { InventorySummaryTable } from './inventory-summary-table'
import { EXCEL_COLUMNS, buildExcelRows, fmtDisplay } from './inventory-summary-utils'
import { PeriodPicker, usePeriod } from './period-picker'


export function InventorySummaryPage() {
  const navigate = useNavigate()
  const period = usePeriod()
  const { range, valid } = period
  const [groupId, setGroupId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const { data: groups } = useIngredientGroups()
  const variants = useFeatures().isEnabled('product_variants')
  const [byProduct, setByProduct] = useState(false)
  const [category, setCategory] = useState('')
  const [attrValueId, setAttrValueId] = useState('')
  const { data: products } = useProducts({ limit: 500 }, variants)
  const { data: attributes } = useProductAttributes(variants)
  const categories = [...new Set((products?.data ?? []).map((p) => p.category).filter((c): c is string => !!c))].sort()
  const { data, isLoading, refetch } = useInventorySummary({
    ...range,
    groupId: groupId || undefined,
    warehouseId: warehouseId || undefined,
    ...(variants ? { groupBy: byProduct ? 'product' : undefined, category: category || undefined, attributeValueId: attrValueId || undefined } : {}),
  })

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
        <WarehouseSelect allowAll value={warehouseId} onChange={setWarehouseId} testId="filter-warehouse" />
        {variants && (
          <>
            <select className="text-win-base" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="text-win-base" value={attrValueId} onChange={(e) => setAttrValueId(e.target.value)}>
              <option value="">Mọi thuộc tính</option>
              {attributes?.map((a) => (
                <optgroup key={a.id} label={a.name}>
                  {a.values.map((v) => <option key={v.id} value={v.id}>{v.value}</option>)}
                </optgroup>
              ))}
            </select>
            <label className="inline-flex items-center gap-1 text-win-base">
              <input type="checkbox" checked={byProduct} onChange={(e) => setByProduct(e.target.checked)} /> Gộp theo sản phẩm
            </label>
          </>
        )}
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
