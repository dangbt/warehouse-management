import { vatRatePercent, type VatRate } from '@wms/shared'

/** Thành tiền chưa thuế của một dòng: số lượng × hệ số quy đổi × đơn giá. */
export function lineTotalPrice(i: { quantity?: number; factor?: number; unit_price?: number }): number {
  return (i.quantity || 0) * (i.factor || 1) * (i.unit_price || 0)
}

/**
 * Tiền thuế VAT của một dòng, làm tròn về đồng theo từng dòng.
 * Khớp công thức API `computeLineVat`: Math.round(totalPrice × pct / 100).
 * `vatRate` null/undefined ⇒ 0 (phiếu không có hoá đơn).
 */
export function computeLineVat(totalPrice: number, vatRate: VatRate | null | undefined): number {
  if (vatRate == null) return 0
  return Math.round((totalPrice * vatRatePercent(vatRate)) / 100)
}

export interface VatLineInput {
  quantity?: number
  factor?: number
  unit_price?: number
  vat_rate?: string
}

export interface VatTotals {
  subtotal: number
  vatAmount: number
  totalAmount: number
}

/**
 * Tổng tiền hàng, tiền thuế và tổng thanh toán của cả phiếu.
 * Khi `hasInvoice` là false, tiền thuế = 0 (bỏ qua thuế suất từng dòng).
 */
export function computeVatTotals(items: VatLineInput[], hasInvoice: boolean): VatTotals {
  let subtotal = 0
  let vatAmount = 0
  for (const i of items) {
    const total = lineTotalPrice(i)
    subtotal += total
    vatAmount += hasInvoice ? computeLineVat(total, (i.vat_rate as VatRate) ?? null) : 0
  }
  return { subtotal, vatAmount, totalAmount: subtotal + vatAmount }
}
