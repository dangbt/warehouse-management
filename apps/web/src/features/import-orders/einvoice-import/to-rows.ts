import { normalizeKey } from '../excel-import/columns'
import type { ParsedRow } from '../excel-import/parse'
import type { EinvoiceResult } from './types'

export interface BuiltRows {
  rows: ParsedRow[]
  /** rowNo → ĐVT trên hoá đơn (để lưu mapping). */
  unitByRow: Record<number, string>
  /** rowNo → khoá dòng hoá đơn (file + STT) để lưu hệ số người dùng sửa. */
  keyByRow: Record<number, string>
  /** Tên hàng (đã chuẩn hoá) → nguyên liệu đã nhớ, dùng làm giá trị khởi tạo cho bảng map tay. */
  seedMap: Record<string, string>
}

const round2 = (n: number) => Math.round(n * 100) / 100
export const lineKey = (file: string, stt: number) => `${file}#${stt}`

/** Hoá đơn dùng được = đọc OK và chưa nhập. */
export const usableInvoices = (results: EinvoiceResult[]) => results.filter((r) => r.ok && r.invoice && !r.duplicateOf)

/**
 * Biến hoá đơn đã đọc thành các dòng cùng định dạng file Excel (WMS-13) để dùng lại bảng xem trước + kiểm lỗi + tạo phiếu.
 * `factors`: hệ số người dùng sửa theo dòng (ưu tiên hơn mapping đã nhớ).
 */
export function buildRows(results: EinvoiceResult[], factors: Record<string, number>, skip: Set<string>): BuiltRows {
  const rows: ParsedRow[] = []
  const unitByRow: Record<number, string> = {}
  const keyByRow: Record<number, string> = {}
  const seedMap: Record<string, string> = {}
  for (const r of usableInvoices(results)) {
    if (skip.has(r.fileName)) continue
    const inv = r.invoice!
    for (const l of inv.lines) {
      const rowNo = rows.length + 1
      const factor = factors[lineKey(r.fileName, l.stt)] ?? l.mapping?.factor ?? 1
      if (l.mapping) seedMap[normalizeKey(l.name)] = l.mapping.ingredientId
      unitByRow[rowNo] = l.unit
      keyByRow[rowNo] = lineKey(r.fileName, l.stt)
      const base = l.quantity * factor
      rows.push({
        rowNo,
        voucherDate: inv.invoiceDate,
        voucherNo: '',
        partner: inv.seller.taxCode,
        invoiceNo: inv.invoiceNo,
        invoiceSymbol: inv.symbol,
        invoiceDate: inv.invoiceDate,
        ingredient: l.name,
        quantity: l.quantity,
        factor,
        // Đơn giá theo đơn vị tồn, tính từ thành tiền (đã trừ chiết khấu) để tổng phiếu khớp hoá đơn.
        unitPrice: base > 0 ? round2(l.amount / base) : 0,
        vatRate: l.vatRate,
        expiry: '',
        note: `HĐĐT ${inv.symbol}-${inv.invoiceNo}`,
        errors: [],
      })
    }
  }
  return { rows, unitByRow, keyByRow, seedMap }
}
