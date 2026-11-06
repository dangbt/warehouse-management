import { WinSearchSelect } from '@wms/ui-winforms'
import { formatNumber } from '@wms/shared'
import { CircleAlert, CircleCheck, Trash2 } from 'lucide-react'
import type { PreviewRow, IngredientRef } from './validate'

interface Props {
  rows: PreviewRow[]
  ingredients: IngredientRef[]
  onMapIngredient: (ingredientText: string, id: string) => void
  onRemove: (rowNo: number) => void
}

/** Bảng xem trước: trạng thái + lý do lỗi từng dòng; dòng NL chưa khớp có ô tìm để map tay. */
export function PreviewTable({ rows, ingredients, onMapIngredient, onRemove }: Props) {
  const options = ingredients.map((i) => ({ value: i.id, label: i.unit ? `${i.name} (${i.unit})` : i.name }))
  return (
    <div className="overflow-auto border border-win-grid-border max-h-[50vh]">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-win-grid-header">
          <tr>
            {['Dòng', 'Trạng thái', 'Ngày CT', 'Số CT', 'NCC', 'Nguyên liệu', 'SL', 'Hệ số', 'Đơn giá', 'Thuế', ''].map((h) => (
              <th key={h} className="p-1.5 text-left whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ok = r.allErrors.length === 0
            const unmatched = !r.ingredientId && !!r.ingredient
            return (
              <tr key={r.rowNo} className={`border-b border-win-grid-border align-top ${ok ? '' : 'bg-red-50'}`}>
                <td className="p-1.5">{r.rowNo}</td>
                <td className="p-1.5 min-w-[200px]">
                  {ok ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CircleCheck size={14} /> Hợp lệ
                    </span>
                  ) : (
                    <ul className="text-red-700">
                      {r.allErrors.map((e) => (
                        <li key={e} className="flex items-start gap-1">
                          <CircleAlert size={14} className="mt-0.5 shrink-0" /> {e}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="p-1.5 whitespace-nowrap">{r.voucherDate}</td>
                <td className="p-1.5">{r.voucherNo}</td>
                <td className="p-1.5">{r.partner}</td>
                <td className="p-1.5 min-w-[220px]">
                  {r.ingredient}
                  {unmatched && (
                    <WinSearchSelect
                      name={`map-${r.rowNo}`}
                      value=""
                      placeholder="Chọn nguyên liệu..."
                      options={options}
                      onChange={(v: string) => v && onMapIngredient(r.ingredient, v)}
                    />
                  )}
                </td>
                <td className="p-1.5 text-right">{r.quantity == null ? '' : formatNumber(r.quantity)}</td>
                <td className="p-1.5 text-right">{r.factor ?? ''}</td>
                <td className="p-1.5 text-right">{r.unitPrice == null ? '' : formatNumber(r.unitPrice)}</td>
                <td className="p-1.5">{r.vatRate}</td>
                <td className="p-1.5">
                  <button type="button" title="Bỏ dòng này" onClick={() => onRemove(r.rowNo)} className="cursor-pointer text-win-text-secondary hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
