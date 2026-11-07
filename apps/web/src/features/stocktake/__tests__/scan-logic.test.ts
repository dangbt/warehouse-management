import { describe, it, expect } from 'vitest'
import { bumpActual } from '../scan-logic'

const rows = [
  { ingredientId: 'a', systemQty: 5, actualQty: 5, difference: 0 },
  { ingredientId: 'b', systemQty: 2, actualQty: 0, difference: -2 },
]

describe('bumpActual', () => {
  it('+1 thực tế và cập nhật chênh lệch', () => {
    const next = bumpActual(rows, 'b')!
    expect(next[1]).toMatchObject({ actualQty: 1, difference: -1 })
    expect(next[0]).toBe(rows[0])
  })
  it('hàng ngoài phiên → null', () => {
    expect(bumpActual(rows, 'zzz')).toBeNull()
  })
})
