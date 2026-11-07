import { useNavigate } from '@tanstack/react-router'
import { formatNumber } from '@wms/shared'
import type { StockCardData } from '@/data'
import { docRoute, voucherDateVn, type StockCardMode } from './stock-card-utils'

const Num = ({ v, bold }: { v: number | null; bold?: boolean }) => (
  <td className={`px-2 py-0.5 text-right tabular-nums ${v !== null && v < 0 ? 'text-win-error' : ''} ${bold ? 'font-bold' : ''}`}>
    {v === null || v === 0 ? '' : formatNumber(v)}
  </td>
)

export function StockCardTable({ card, mode }: { card: StockCardData; mode: StockCardMode }) {
  const navigate = useNavigate()
  const value = mode === 'value'
  const span = value ? 10 : 6
  const t = card.totals
  return (
    <table className="text-win-base border-collapse w-full min-w-[900px]">
      <thead className="sticky top-0 bg-win-surface">
        <tr className="border-b">
          <th className="px-2 text-left">Số CT</th>
          <th className="px-2 text-center">Ngày CT</th>
          <th className="px-2 text-left">Diễn giải</th>
          {value && <th className="px-2 text-right">Đơn giá</th>}
          <th className="px-2 text-right">{value ? 'SL nhập' : 'Nhập'}</th>
          <th className="px-2 text-right">{value ? 'SL xuất' : 'Xuất'}</th>
          <th className="px-2 text-right">{value ? 'SL tồn' : 'Tồn'}</th>
          {value && <><th className="px-2 text-right">GT nhập</th><th className="px-2 text-right">GT xuất</th><th className="px-2 text-right">GT tồn</th></>}
        </tr>
      </thead>
      <tbody>
        <tr className="bg-win-surface font-semibold">
          <td colSpan={3} className="px-2 py-0.5">Tồn đầu kỳ</td>
          {value ? <><td /><td /><td /><Num v={card.opening.qty} bold /><td /><td /><Num v={card.opening.value} bold /></>
            : <><td /><td /><Num v={card.opening.qty} bold /></>}
        </tr>
        {card.lines.map((l) => (
          <tr key={l.id} className="border-b border-win-border/40">
            <td className="px-2 py-0.5">
              {l.voucherNo && l.docType && l.docId ? (
                <button
                  type="button"
                  className="text-win-link underline"
                  title="Mở chứng từ gốc"
                  onClick={() => { navigate(docRoute(l.docType!, l.docId!)) }}
                >
                  {l.voucherNo}
                </button>
              ) : (l.voucherNo ?? '')}
            </td>
            <td className="px-2 py-0.5 text-center">{voucherDateVn(l.voucherDate)}</td>
            <td className="px-2 py-0.5">{l.description}</td>
            {value && <Num v={l.unitPrice} />}
            <Num v={l.inQty} />
            <Num v={l.outQty} />
            <Num v={l.balanceQty} />
            {value && <><Num v={l.inValue} /><Num v={l.outValue} /><Num v={l.balanceValue} /></>}
          </tr>
        ))}
        <tr className="bg-win-surface font-bold border-t-2">
          <td colSpan={value ? 4 : 3} className="px-2 py-0.5">Cộng phát sinh trong kỳ</td>
          <Num v={t.inQty} bold /><Num v={t.outQty} bold /><td />
          {value && <><Num v={t.inValue} bold /><Num v={t.outValue} bold /><td /></>}
        </tr>
        <tr className="bg-win-surface font-bold border-b">
          <td colSpan={span - (value ? 3 : 1)} className="px-2 py-0.5">Tồn cuối kỳ</td>
          <Num v={card.closing.qty} bold />
          {value && <><td /><td /><Num v={card.closing.value} bold /></>}
        </tr>
      </tbody>
    </table>
  )
}
