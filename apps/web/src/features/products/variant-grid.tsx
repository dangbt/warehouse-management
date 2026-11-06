import { useState } from 'react'
import { applyBulk } from './variant-matrix'
import type { Axis, BulkField, VariantRow } from './variant-matrix'

interface Props {
  rows: VariantRow[]
  axes: Axis[]
  onChange: (rows: VariantRow[]) => void
}

type Editable = 'sku' | 'name' | 'salePrice' | 'costPrice' | 'barcode'

const cell = 'w-full h-7 px-1.5 text-win-base border border-win-input-border bg-white outline-none focus:border-win-input-focus'

/** Lưới xem trước biến thể: sửa inline + áp giá hàng loạt theo cột (tất cả) hoặc theo hàng/cột của ma trận (một giá trị thuộc tính). */
export function VariantGrid({ rows, axes, onChange }: Props) {
  const [field, setField] = useState<BulkField>('salePrice')
  const [value, setValue] = useState('')
  const [scope, setScope] = useState('')

  const setCell = (key: string, f: Editable, v: string) => onChange(rows.map((r) => (r.key === key ? { ...r, [f]: v, touched: r.touched || f === 'sku' || f === 'name' } : r)))
  const scopes = axes.flatMap((a) => a.values.map((v) => ({ id: v.id, label: `${a.attributeName}: ${v.value}` })))

  return (
    <div data-testid="variant-grid">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-win-base">Áp giá hàng loạt:</span>
        <select value={field} onChange={(e) => setField(e.target.value as BulkField)} className="h-7 border border-win-input-border bg-white text-win-base" aria-label="Cột áp giá">
          <option value="salePrice">Giá bán</option>
          <option value="costPrice">Giá vốn</option>
        </select>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-7 border border-win-input-border bg-white text-win-base" aria-label="Phạm vi áp giá">
          <option value="">Tất cả dòng</option>
          {scopes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Giá" aria-label="Giá áp hàng loạt" className="h-7 w-28 px-1.5 border border-win-input-border text-win-base" />
        <button
          type="button"
          disabled={value === '' || rows.length === 0}
          onClick={() => onChange(applyBulk(rows, field, value, scope || undefined))}
          className="px-3 h-7 text-win-base bg-win-button border border-win-button-border cursor-pointer hover:bg-win-button-hover disabled:opacity-50"
        >
          Áp dụng
        </button>
      </div>
      <div className="max-h-[300px] overflow-auto border border-win-grid-border">
        <table className="w-full text-win-base">
          <thead className="sticky top-0 bg-win-grid-header">
            <tr>
              <th className="py-1.5 px-1 text-left w-8">#</th>
              <th className="py-1.5 px-1 text-left">SKU</th>
              <th className="py-1.5 px-1 text-left">Tên</th>
              <th className="py-1.5 px-1 text-right w-28">Giá bán</th>
              <th className="py-1.5 px-1 text-right w-28">Giá vốn</th>
              <th className="py-1.5 px-1 text-left w-36">Mã vạch</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className="border-b border-win-grid-border" data-testid="variant-row">
                <td className="px-1 text-win-text-secondary">
                  {i + 1}
                  {!r.existingId && <span className="ml-1 text-win-xs text-green-700">mới</span>}
                </td>
                <td className="px-1 py-0.5"><input className={cell} value={r.sku} onChange={(e) => setCell(r.key, 'sku', e.target.value)} aria-label={`SKU ${i + 1}`} /></td>
                <td className="px-1 py-0.5"><input className={cell} value={r.name} onChange={(e) => setCell(r.key, 'name', e.target.value)} aria-label={`Tên ${i + 1}`} /></td>
                <td className="px-1 py-0.5"><input className={`${cell} text-right`} type="number" min={0} value={r.salePrice} onChange={(e) => setCell(r.key, 'salePrice', e.target.value)} aria-label={`Giá bán ${i + 1}`} /></td>
                <td className="px-1 py-0.5"><input className={`${cell} text-right`} type="number" min={0} value={r.costPrice} onChange={(e) => setCell(r.key, 'costPrice', e.target.value)} aria-label={`Giá vốn ${i + 1}`} /></td>
                <td className="px-1 py-0.5"><input className={cell} value={r.barcode} onChange={(e) => setCell(r.key, 'barcode', e.target.value)} aria-label={`Mã vạch ${i + 1}`} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-center text-win-text-secondary">
                  Chọn giá trị thuộc tính để xem trước các biến thể
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-win-xs text-win-text-secondary">{rows.length} biến thể</p>
    </div>
  )
}
