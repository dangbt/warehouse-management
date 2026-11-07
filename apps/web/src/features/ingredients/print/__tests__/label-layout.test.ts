import { describe, it, expect } from 'vitest'
import { buildLabels, paginate } from '../label-layout'

const a = { id: 'a', name: 'Thịt bò', unit: 'kg', barcode: '2000000000015', sku: 'TB' }
const b = { id: 'b', name: 'Hành', unit: 'kg', sku: 'HANH' }
const c = { id: 'c', name: 'Muối', unit: 'kg' }

describe('buildLabels', () => {
  it('ưu tiên barcode, không có thì SKU, bỏ hàng không có mã', () => {
    const { labels, missing } = buildLabels([a, b, c], 1)
    expect(labels.map((l) => l.code)).toEqual(['2000000000015', 'HANH'])
    expect(missing).toEqual(['Muối'])
  })
  it('nhân bản theo số tem và kẹp giá trị', () => {
    expect(buildLabels([a], 3).labels).toHaveLength(3)
    expect(buildLabels([a], 0).labels).toHaveLength(1)
  })
})

describe('paginate', () => {
  it('chia 24 tem/trang', () => {
    expect(paginate(Array.from({ length: 50 }, (_, i) => i), 24).map((p) => p.length)).toEqual([24, 24, 2])
  })
})
