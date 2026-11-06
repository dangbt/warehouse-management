import type { InventorySummaryReport, InventoryTotals, QtyValue } from '@/data'
import { formatNumber } from '@wms/shared'

const HEADS = ['Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ'] as const
const KEYS = ['opening', 'inbound', 'outbound', 'closing'] as const

function Num({ v, bold }: { v: number; bold?: boolean }) {
  return (
    <td className={`px-2 py-0.5 text-right tabular-nums ${v < 0 ? 'text-win-error' : ''} ${bold ? 'font-bold' : ''}`}>
      {formatNumber(v)}
    </td>
  )
}

function Cells({ t, bold }: { t: InventoryTotals; bold?: boolean }) {
  return (
    <>
      {KEYS.map((k) => {
        const x: QtyValue = t[k]
        return (
          <>
            <Num key={`${k}q`} v={x.qty} bold={bold} />
            <Num key={`${k}v`} v={x.value} bold={bold} />
          </>
        )
      })}
    </>
  )
}

export function InventorySummaryTable({ report, onRowOpen }: { report: InventorySummaryReport; onRowOpen?: (ingredientId: string) => void }) {
  return (
    <table className="text-win-base border-collapse w-full min-w-[1100px]">
      <thead className="sticky top-0 bg-win-surface">
        <tr className="border-b">
          <th rowSpan={2} className="px-2 text-left">Mã</th>
          <th rowSpan={2} className="px-2 text-left">Tên nguyên liệu</th>
          <th rowSpan={2} className="px-2 text-center">ĐVT</th>
          {HEADS.map((h) => <th key={h} colSpan={2} className="px-2 text-center border-l">{h}</th>)}
        </tr>
        <tr className="border-b">
          {HEADS.map((h) => (
            <>
              <th key={`${h}q`} className="px-2 text-right border-l">SL</th>
              <th key={`${h}v`} className="px-2 text-right">GT</th>
            </>
          ))}
        </tr>
      </thead>
      <tbody>
        {report.groups.map((g) => (
          <>
            <tr key={`h-${g.groupId}`} className="bg-win-surface font-semibold">
              <td colSpan={11} className="px-2 py-0.5">{g.groupName}</td>
            </tr>
            {g.rows.map((r) => (
              <tr
                key={r.ingredientId}
                className="border-b border-win-border/40 cursor-pointer hover:bg-win-surface"
                title="Nhấp đúp để xem Thẻ kho"
                onDoubleClick={() => onRowOpen?.(r.ingredientId)}
              >
                <td className="px-2 py-0.5">{r.code}</td>
                <td className="px-2 py-0.5">{r.name}</td>
                <td className="px-2 py-0.5 text-center">{r.unit}</td>
                <Cells t={r} />
              </tr>
            ))}
            <tr key={`t-${g.groupId}`} className="bg-win-surface font-bold border-b">
              <td colSpan={3} className="px-2 py-0.5">Cộng nhóm {g.groupName}</td>
              <Cells t={g.total} bold />
            </tr>
          </>
        ))}
        <tr className="bg-win-surface font-bold border-t-2">
          <td colSpan={3} className="px-2 py-1">TỔNG CỘNG</td>
          <Cells t={report.grandTotal} bold />
        </tr>
      </tbody>
    </table>
  )
}
