import { describe, it, expect } from 'vitest'
import { lineTotalPrice, computeLineVat, computeVatTotals } from '../vat'

describe('import-order VAT utility', () => {
  it('lineTotalPrice = quantity × factor × unit_price (factor mặc định 1)', () => {
    expect(lineTotalPrice({ quantity: 5, factor: 24, unit_price: 10000 })).toBe(1_200_000)
    expect(lineTotalPrice({ quantity: 3, unit_price: 50000 })).toBe(150_000)
    expect(lineTotalPrice({})).toBe(0)
  })

  it('computeLineVat làm tròn về đồng theo từng dòng, khớp công thức API', () => {
    // 8% của 1.000.000 = 80.000
    expect(computeLineVat(1_000_000, '8')).toBe(80_000)
    // 10% của 123.456 = 12.345,6 → 12.346
    expect(computeLineVat(123_456, '10')).toBe(12_346)
    // 5% của 99.999 = 4.999,95 → 5.000
    expect(computeLineVat(99_999, '5')).toBe(5_000)
  })

  it('các mã không chịu thuế và null trả về 0', () => {
    expect(computeLineVat(1_000_000, '0')).toBe(0)
    expect(computeLineVat(1_000_000, 'KCT')).toBe(0)
    expect(computeLineVat(1_000_000, 'KKKNT')).toBe(0)
    expect(computeLineVat(1_000_000, null)).toBe(0)
    expect(computeLineVat(1_000_000, undefined)).toBe(0)
  })

  it('computeVatTotals cộng tiền thuế đã làm tròn từng dòng khi có hoá đơn', () => {
    const items = [
      { quantity: 1, unit_price: 123_456, vat_rate: '10' }, // total 123.456, vat 12.346
      { quantity: 2, unit_price: 99_999, vat_rate: '5' }, // total 199.998, vat round(9.999,9)=10.000
    ]
    const t = computeVatTotals(items, true)
    expect(t.subtotal).toBe(123_456 + 199_998)
    expect(t.vatAmount).toBe(12_346 + 10_000)
    expect(t.totalAmount).toBe(t.subtotal + t.vatAmount)
  })

  it('không có hoá đơn ⇒ tiền thuế = 0, tổng = tiền hàng', () => {
    const items = [{ quantity: 1, unit_price: 1_000_000, vat_rate: '10' }]
    const t = computeVatTotals(items, false)
    expect(t.subtotal).toBe(1_000_000)
    expect(t.vatAmount).toBe(0)
    expect(t.totalAmount).toBe(1_000_000)
  })
})
