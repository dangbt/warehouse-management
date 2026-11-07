import { CircleCheck } from 'lucide-react'
import type { LowStockProduct } from '@/data/use-reports'

interface PlainItem { name: string; unit: string; currentStock: string; minStock: string }

/** Tồn thấp: NL thường như cũ; SP có biến thể gom thành 1 dòng (số biến thể thấp/hết hàng). */
export function LowStockList({ plain, products }: { plain: PlainItem[]; products?: LowStockProduct[] }) {
  const prods = products ?? []
  if (!plain.length && !prods.length) {
    return (
      <p className="text-win-base text-win-success inline-flex items-center gap-1.5">
        <CircleCheck size={14} /> Tất cả đủ stock
      </p>
    )
  }
  return (
    <table className="w-full text-win-base">
      <thead>
        <tr className="bg-win-grid-header">
          <th className="text-left p-1">{products ? 'SP / NL' : 'NL'}</th>
          <th className="p-1">Tồn</th>
          <th className="p-1">{products ? 'Biến thể thấp' : 'Min'}</th>
        </tr>
      </thead>
      <tbody>
        {prods.slice(0, 5).map((p) => (
          <tr key={p.productId} className="border-b border-win-grid-border text-win-error" title={p.variants.map((v) => `${v.name}: ${v.currentStock}/${v.minStock}`).join('\n')}>
            <td className="p-1">{p.code} - {p.name}</td>
            <td className="p-1 text-center">{p.totalStock} {p.unit}</td>
            <td className="p-1 text-center">{p.lowCount + p.outCount}{p.outCount ? ` (hết: ${p.outCount})` : ''}</td>
          </tr>
        ))}
        {plain.slice(0, 5).map((i) => (
          <tr key={i.name} className="border-b border-win-grid-border text-win-error">
            <td className="p-1">{i.name}</td>
            <td className="p-1 text-center">{i.currentStock} {i.unit}</td>
            <td className="p-1 text-center">{i.minStock} {i.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
