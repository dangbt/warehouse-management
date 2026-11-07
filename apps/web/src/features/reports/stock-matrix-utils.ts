import type { StockMatrix, StockMatrixCell } from '@/data'

export const STATUS_CLASS: Record<StockMatrixCell['status'], string> = {
  out: 'bg-red-200 text-red-900',
  low: 'bg-amber-200 text-amber-900',
  ok: '',
}

type Cell = string | number | null

/** Excel: mỗi SP một khối (tiêu đề, dòng tiêu đề cột, các dòng màu, dòng tổng cột). Số cột = khối rộng nhất. */
export function buildMatrixExcel(products: StockMatrix[]): { columns: { header: string; width: number; align?: 'right' }[]; rows: Cell[][] } {
  const width = Math.max(0, ...products.map((p) => p.cols.length)) + 2
  const pad = (cells: Cell[]): Cell[] => [...cells, ...Array<Cell>(Math.max(0, width - cells.length)).fill(null)]
  const rows: Cell[][] = []
  for (const p of products) {
    rows.push(pad([`${p.code} - ${p.name}`]))
    rows.push(pad([p.rowAttribute && p.colAttribute ? `${p.rowAttribute} \\ ${p.colAttribute}` : '', ...p.cols, 'Tổng']))
    p.rows.forEach((r, ri) => {
      rows.push(pad([r, ...p.cells[ri].map((c) => c?.qty ?? null), p.rowTotals[ri]]))
    })
    rows.push(pad(['Tổng', ...p.colTotals, p.grandTotal]))
    rows.push(pad([]))
  }
  const columns = Array.from({ length: width }, (_, i) => ({ header: i === 0 ? 'Sản phẩm / Màu' : i === width - 1 ? 'Tổng' : `Cột ${i}`, width: i === 0 ? 28 : 10, ...(i ? { align: 'right' as const } : {}) }))
  return { columns, rows }
}
