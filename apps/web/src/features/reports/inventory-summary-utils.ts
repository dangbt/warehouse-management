import type { InventorySummaryReport, InventoryTotals } from '@/data'

export type PeriodKind = 'month' | 'quarter' | 'year' | 'custom'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate()

export const fmtDisplay = (d: string) => d.split('-').reverse().join('/')

/** Khoảng ngày (YYYY-MM-DD) cho kỳ tháng/quý/năm. month: 1-12, quarter: 1-4. */
export function periodRange(kind: Exclude<PeriodKind, 'custom'>, year: number, index: number): { from: string; to: string } {
  if (kind === 'year') return { from: ymd(year, 1, 1), to: ymd(year, 12, 31) }
  if (kind === 'quarter') {
    const m1 = (index - 1) * 3 + 1
    const m3 = m1 + 2
    return { from: ymd(year, m1, 1), to: ymd(year, m3, lastDay(year, m3)) }
  }
  return { from: ymd(year, index, 1), to: ymd(year, index, lastDay(year, index)) }
}

export const EXCEL_COLUMNS = [
  { header: 'Mã', width: 12 },
  { header: 'Tên nguyên liệu', width: 28 },
  { header: 'ĐVT', width: 8, align: 'center' as const },
  ...['Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ'].flatMap((h) => [
    { header: `${h} - SL`, width: 14, align: 'right' as const },
    { header: `${h} - GT`, width: 16, align: 'right' as const },
  ]),
]

function totalsCells(t: InventoryTotals): number[] {
  return [t.opening, t.inbound, t.outbound, t.closing].flatMap((x) => [x.qty, x.value])
}

/** Dòng Excel đúng thứ tự màn hình: từng nhóm (dòng tiêu đề nhóm → NL → tổng nhóm), cuối là tổng cộng. */
export function buildExcelRows(report: InventorySummaryReport): { rows: (string | number | null)[][]; totalRow: (string | number | null)[] } {
  const rows: (string | number | null)[][] = []
  for (const g of report.groups) {
    rows.push([null, `Nhóm: ${g.groupName}`, null, ...Array(8).fill(null)])
    for (const r of g.rows) {
      rows.push([r.code, r.name, r.unit, ...totalsCells(r)])
      for (const v of r.variants ?? []) rows.push([v.code, `   ${v.variantLabel ?? v.name}`, v.unit, ...totalsCells(v)])
    }
    rows.push([null, `Cộng nhóm ${g.groupName}`, null, ...totalsCells(g.total)])
  }
  return { rows, totalRow: [null, 'TỔNG CỘNG', null, ...totalsCells(report.grandTotal)] }
}
