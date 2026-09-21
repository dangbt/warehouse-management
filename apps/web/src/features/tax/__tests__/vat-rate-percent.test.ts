import { describe, it, expect } from 'vitest'
import { vatRatePercent, VAT_RATES, VAT_RATE_LABELS } from '@wms/shared'

describe('vatRatePercent', () => {
  it('trả về số phần trăm cho các thuế suất chịu thuế', () => {
    expect(vatRatePercent('5')).toBe(5)
    expect(vatRatePercent('8')).toBe(8)
    expect(vatRatePercent('10')).toBe(10)
  })

  it('trả về 0 cho các mã không chịu thuế', () => {
    expect(vatRatePercent('0')).toBe(0)
    expect(vatRatePercent('KCT')).toBe(0)
    expect(vatRatePercent('KKKNT')).toBe(0)
  })

  it('mọi mã trong VAT_RATES đều có label và giá trị phần trăm hợp lệ', () => {
    for (const rate of VAT_RATES) {
      expect(VAT_RATE_LABELS[rate]).toBeTruthy()
      const pct = vatRatePercent(rate)
      expect(pct).toBeGreaterThanOrEqual(0)
      expect(pct).toBeLessThanOrEqual(100)
    }
  })
})
