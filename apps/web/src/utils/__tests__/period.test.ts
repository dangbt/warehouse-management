import { describe, it, expect } from 'vitest'
import { resolvePeriod } from '../period'

// 2026-11-06 (thứ Sáu) 10:00 giờ VN
const NOW = new Date('2026-11-06T03:00:00.000Z')

describe('resolvePeriod', () => {
  it('hôm nay / tuần này / tháng này', () => {
    expect(resolvePeriod('today', '', '', NOW)).toEqual({ from: '2026-11-06', to: '2026-11-06' })
    expect(resolvePeriod('week', '', '', NOW)).toEqual({ from: '2026-11-02', to: '2026-11-08' })
    expect(resolvePeriod('month', '', '', NOW)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
  })
  it('tháng trước / quý này / năm nay', () => {
    expect(resolvePeriod('last_month', '', '', NOW)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(resolvePeriod('quarter', '', '', NOW)).toEqual({ from: '2026-10-01', to: '2026-12-31' })
    expect(resolvePeriod('year', '', '', NOW)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
  it('tuỳ chọn và rỗng', () => {
    expect(resolvePeriod('custom', '2026-01-02', '2026-01-09', NOW)).toEqual({ from: '2026-01-02', to: '2026-01-09' })
    expect(resolvePeriod('', '', '', NOW)).toEqual({})
  })
})
