import { describe, expect, it } from 'vitest'
import { docRoute, voucherDateVn } from './stock-card-utils'

describe('voucherDateVn', () => {
  it('00:00 giờ VN (17:00Z hôm trước) hiển thị đúng ngày chứng từ', () => {
    expect(voucherDateVn('2026-10-31T17:00:00.000Z')).toBe('01/11/2026')
    expect(voucherDateVn('2026-11-04T17:00:00.000Z')).toBe('05/11/2026')
  })
  it('cuối ngày VN vẫn đúng ngày', () => {
    expect(voucherDateVn('2026-11-01T16:59:59.999Z')).toBe('01/11/2026')
  })
})

describe('docRoute', () => {
  it('mở đúng chứng từ gốc theo id', () => {
    expect(docRoute('IMPORT_ORDER', 'a1')).toEqual({ to: '/import-orders', search: { id: 'a1' } })
    expect(docRoute('STOCK_EXPORT', 'b2')).toEqual({ to: '/stock-exports', search: { id: 'b2' } })
    expect(docRoute('PURCHASE_RETURN', 'c3')).toEqual({ to: '/purchase-returns', search: { id: 'c3' } })
    expect(docRoute('PROCESSING', 'd4')).toEqual({ to: '/processing', search: { id: 'd4' } })
    expect(docRoute('STOCKTAKE', 'e5')).toEqual({ to: '/stocktake/$id', params: { id: 'e5' } })
  })
})
