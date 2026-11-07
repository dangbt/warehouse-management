import { describe, it, expect } from 'vitest'
import { pickExact } from '../lookup'

const list = [
  { id: '1', name: 'A', unit: 'kg', sku: 'NL-01', barcode: '2000000000015' },
  { id: '2', name: 'B', unit: 'kg', sku: 'NL-011', barcode: null },
]

describe('pickExact', () => {
  it('khớp đúng barcode hoặc SKU, không khớp một phần', () => {
    expect(pickExact(list, '2000000000015')?.id).toBe('1')
    expect(pickExact(list, 'nl-011')?.id).toBe('2')
    expect(pickExact(list, 'NL-0')).toBeNull()
  })
})
