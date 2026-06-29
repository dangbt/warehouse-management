import { useState, useEffect } from 'react'
import { Save, CheckCircle, ArrowLeft } from 'lucide-react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { WinToolbar, WinGroupBox } from '@wms/ui-winforms'
import { useStocktakeDetail, useUpdateStocktakeItems, useCompleteStocktake } from '@/data'
import type { StocktakeItem } from '@/data/use-stocktake'

interface ItemRow {
  id: string
  ingredientName: string
  unit: string
  systemQty: number
  actualQty: number
  difference: number
  note: string
}

export function StocktakeDetailPage() {
  const { id } = useParams({ from: '/_app/stocktake_/$id' })
  const navigate = useNavigate()
  const { data: detail, isLoading } = useStocktakeDetail(id)
  const updateMutation = useUpdateStocktakeItems()
  const completeMutation = useCompleteStocktake()
  const [items, setItems] = useState<ItemRow[]>([])

  useEffect(() => {
    if (detail?.items) {
      setItems(
        detail.items.map((item: StocktakeItem) => ({
          id: item.id,
          ingredientName: item.ingredient.name,
          unit: item.ingredient.unit,
          systemQty: Number(item.systemQty),
          actualQty: item.actualQty != null ? Number(item.actualQty) : Number(item.systemQty),
          difference: item.difference != null ? Number(item.difference) : 0,
          note: item.note ?? '',
        })),
      )
    }
  }, [detail])

  const handleActualChange = (index: number, val: string) => {
    setItems((prev) => {
      const next = [...prev]
      const actual = Number(val) || 0
      next[index] = { ...next[index], actualQty: actual, difference: actual - next[index].systemQty }
      return next
    })
  }

  const handleNoteChange = (index: number, val: string) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], note: val }
      return next
    })
  }

  const handleSave = () => {
    updateMutation.mutate({
      id,
      items: items.map((i) => ({ id: i.id, actualQty: i.actualQty, note: i.note || undefined })),
    })
  }

  const handleComplete = () => {
    completeMutation.mutate(id)
  }

  const isCompleted = detail?.status === 'COMPLETED'

  if (isLoading) return <div className="p-4 text-[11px]">Đang tải...</div>

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button
          icon={<ArrowLeft size={14} />}
          label="Quay lại"
          onClick={() => navigate({ to: '/stocktake' })}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button
          icon={<Save size={14} />}
          label="Lưu"
          disabled={isCompleted}
          onClick={handleSave}
        />
        <WinToolbar.Button
          icon={<CheckCircle size={14} />}
          label="Hoàn thành"
          disabled={isCompleted}
          onClick={handleComplete}
        />
        <WinToolbar.Separator />
        <span className="text-[11px] px-2">
          Phiên: <strong>{detail?.code}</strong> — {isCompleted ? 'Đã hoàn thành' : 'Đang kiểm'}
        </span>
      </WinToolbar>

      <div className="flex-1 overflow-auto p-2">
        <WinGroupBox title="Danh sách kiểm kê">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-win-grid-header">
                <th className="text-left p-1">Nguyên liệu</th>
                <th className="p-1 w-16">ĐVT</th>
                <th className="p-1 w-20">Hệ thống</th>
                <th className="p-1 w-24">Thực tế</th>
                <th className="p-1 w-20">Chênh lệch</th>
                <th className="p-1 w-40">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`border-b border-win-grid-border ${item.difference !== 0 ? 'bg-red-50' : ''}`}
                >
                  <td className="p-1">{item.ingredientName}</td>
                  <td className="p-1 text-center">{item.unit}</td>
                  <td className="p-1 text-right">{item.systemQty}</td>
                  <td className="p-1">
                    <input
                      type="number"
                      value={item.actualQty}
                      onChange={(e) => handleActualChange(idx, e.target.value)}
                      disabled={isCompleted}
                      className="w-full border border-win-input-border px-1 py-0.5 text-right text-[11px] outline-none focus:border-win-input-focus disabled:bg-gray-100"
                    />
                  </td>
                  <td className={`p-1 text-right font-bold ${item.difference !== 0 ? 'text-win-error' : ''}`}>
                    {item.difference !== 0 ? (item.difference > 0 ? `+${item.difference}` : item.difference) : '0'}
                  </td>
                  <td className="p-1">
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => handleNoteChange(idx, e.target.value)}
                      disabled={isCompleted}
                      className="w-full border border-win-input-border px-1 py-0.5 text-[11px] outline-none focus:border-win-input-focus disabled:bg-gray-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </WinGroupBox>
      </div>
    </div>
  )
}
