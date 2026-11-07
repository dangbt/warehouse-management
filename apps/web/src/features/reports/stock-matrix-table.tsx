import type { StockMatrix } from '@/data'
import { formatNumber } from '@wms/shared'
import { STATUS_CLASS } from './stock-matrix-utils'

export function StockMatrixTable({ m }: { m: StockMatrix }) {
  return (
    <div className="mb-4">
      <div className="font-semibold px-2 py-1">{m.code} — {m.name}{m.category ? ` (${m.category})` : ''}</div>
      <table className="text-win-base border-collapse">
        <thead>
          <tr className="bg-win-surface">
            <th className="px-2 py-0.5 text-left border">{m.rowAttribute}{m.colAttribute ? ` \\ ${m.colAttribute}` : ''}</th>
            {m.cols.map((c) => <th key={c} className="px-2 py-0.5 text-center border min-w-[56px]">{c}</th>)}
            <th className="px-2 py-0.5 text-center border bg-win-surface">Tổng</th>
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r, ri) => (
            <tr key={r}>
              <td className="px-2 py-0.5 border font-medium">{r}</td>
              {m.cells[ri].map((c, ci) => (
                <td
                  key={m.cols[ci]}
                  className={`px-2 py-0.5 border text-right tabular-nums ${c ? STATUS_CLASS[c.status] : 'text-win-text-muted'}`}
                  title={c ? (c.status === 'out' ? 'Hết hàng' : c.status === 'low' ? `Dưới mức tối thiểu (${formatNumber(c.minStock)})` : '') : 'Không có biến thể'}
                >
                  {c ? formatNumber(c.qty) : '–'}
                </td>
              ))}
              <td className="px-2 py-0.5 border text-right font-bold bg-win-surface">{formatNumber(m.rowTotals[ri])}</td>
            </tr>
          ))}
          <tr className="bg-win-surface font-bold">
            <td className="px-2 py-0.5 border">Tổng</td>
            {m.colTotals.map((t, i) => <td key={m.cols[i]} className="px-2 py-0.5 border text-right tabular-nums">{formatNumber(t)}</td>)}
            <td className="px-2 py-0.5 border text-right tabular-nums">{formatNumber(m.grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
