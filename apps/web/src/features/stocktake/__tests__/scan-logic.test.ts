import { describe, it, expect } from 'vitest'
import { bumpActual } from '../scan-logic'

const rows = [
  { ingredientId: 'a', systemQty: 5, actualQty: 5, difference: 0 },
  { ingredientId: 'b', systemQty: 2, actualQty: 0, difference: -2 },
]

describe('bumpActual', () => {
  it('lần quét đầu đặt = 1 (không cộng vào tồn điền sẵn), các lần sau +1', () => {
    const counted = new Set<string>()
    const r1 = bumpActual(rows, 'a', counted)!
    expect(r1[0]).toMatchObject({ actualQty: 1, difference: -4 })
    const r2 = bumpActual(r1, 'a', counted)!
    const r3 = bumpActual(r2, 'a', counted)!
    expect(r3[0]).toMatchObject({ actualQty: 3, difference: -2 })
  })
  it('+1 thực tế và cập nhật chênh lệch', () => {
    const next = bumpActual(rows, 'b', new Set())!
    expect(next[1]).toMatchObject({ actualQty: 1, difference: -1 })
    expect(next[0]).toBe(rows[0])
  })
  it('hàng ngoài phiên → null', () => {
    expect(bumpActual(rows, 'zzz', new Set())).toBeNull()
  })
})
