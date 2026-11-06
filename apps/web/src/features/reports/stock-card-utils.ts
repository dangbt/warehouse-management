import type { StockCardData, StockCardLine, StockDocType } from '@/data'
import { fmtDisplay } from './inventory-summary-utils'

export type StockCardMode = 'qty' | 'value'

/** Trang danh sách chứng từ gốc theo loại (chưa có route chi tiết theo id, ngoại trừ kiểm kê). */
export function docRoute(docType: StockDocType, docId: string): { to: string; params?: Record<string, string> } {
  switch (docType) {
    case 'IMPORT_ORDER': return { to: '/import-orders' }
    case 'STOCK_EXPORT': return { to: '/stock-exports' }
    case 'PURCHASE_RETURN': return { to: '/purchase-returns' }
    case 'PROCESSING': return { to: '/processing' }
    case 'STOCKTAKE': return { to: '/stocktake/$id', params: { id: docId } }
  }
}

type Cell = string | number | null

export function excelColumns(mode: StockCardMode) {
  const base = [
    { header: 'Số CT', width: 16 },
    { header: 'Ngày CT', width: 12, align: 'center' as const },
    { header: 'Diễn giải', width: 36 },
  ]
  const n = (header: string) => ({ header, width: 14, align: 'right' as const })
  return mode === 'qty'
    ? [...base, n('Nhập'), n('Xuất'), n('Tồn')]
    : [...base, n('Đơn giá'), n('SL nhập'), n('SL xuất'), n('SL tồn'), n('GT nhập'), n('GT xuất'), n('GT tồn')]
}

function lineCells(l: StockCardLine, mode: StockCardMode): Cell[] {
  const head: Cell[] = [l.voucherNo, fmtDisplay(l.voucherDate.slice(0, 10)), l.description]
  return mode === 'qty'
    ? [...head, l.inQty || null, l.outQty || null, l.balanceQty]
    : [...head, l.unitPrice, l.inQty || null, l.outQty || null, l.balanceQty, l.inValue || null, l.outValue || null, l.balanceValue]
}

/** Dòng Excel đúng thứ tự màn hình: tồn đầu kỳ → giao dịch → cộng phát sinh (totalRow); tồn cuối kỳ là dòng cuối. */
export function buildStockCardRows(card: StockCardData, mode: StockCardMode): { rows: Cell[][]; totalRow: Cell[] } {
  const q = mode === 'qty'
  const opening: Cell[] = q
    ? [null, null, 'Tồn đầu kỳ', null, null, card.opening.qty]
    : [null, null, 'Tồn đầu kỳ', null, null, null, card.opening.qty, null, null, card.opening.value]
  const closing: Cell[] = q
    ? [null, null, 'Tồn cuối kỳ', null, null, card.closing.qty]
    : [null, null, 'Tồn cuối kỳ', null, null, null, card.closing.qty, null, null, card.closing.value]
  const t = card.totals
  const totalRow: Cell[] = q
    ? [null, null, 'Cộng phát sinh trong kỳ', t.inQty, t.outQty, null]
    : [null, null, 'Cộng phát sinh trong kỳ', null, t.inQty, t.outQty, null, t.inValue, t.outValue, null]
  return { rows: [opening, ...card.lines.map((l) => lineCells(l, mode)), closing], totalRow }
}
