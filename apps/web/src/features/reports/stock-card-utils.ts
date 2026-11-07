import type { StockCardData, StockCardLine, StockDocType } from '@/data'
import { fmtDisplay } from './inventory-summary-utils'

export type StockCardMode = 'qty' | 'value'

/** Ngày chứng từ (ISO UTC) → "dd/mm/yyyy" theo giờ Việt Nam (UTC+7), không phụ thuộc múi giờ máy. */
export function voucherDateVn(iso: string): string {
  return fmtDisplay(new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10))
}

type DocTarget =
  | { to: '/import-orders'; search: { id: string } }
  | { to: '/stock-exports'; search: { id: string } }
  | { to: '/purchase-returns'; search: { id: string } }
  | { to: '/processing'; search: { id: string } }
  | { to: '/stock-transfers'; search: { id: string } }
  | { to: '/stocktake/$id'; params: { id: string } }

/** Chứng từ gốc: trang danh sách lọc đúng phiếu (search.id) hoặc trang chi tiết kiểm kê. */
export function docRoute(docType: StockDocType, docId: string): DocTarget {
  switch (docType) {
    case 'IMPORT_ORDER': return { to: '/import-orders', search: { id: docId } }
    case 'STOCK_EXPORT': return { to: '/stock-exports', search: { id: docId } }
    case 'PURCHASE_RETURN': return { to: '/purchase-returns', search: { id: docId } }
    case 'STOCK_TRANSFER': return { to: '/stock-transfers', search: { id: docId } }
    case 'PROCESSING': return { to: '/processing', search: { id: docId } }
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
  const head: Cell[] = [l.voucherNo, voucherDateVn(l.voucherDate), l.description]
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
