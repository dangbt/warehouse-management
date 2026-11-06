import { describe, it, expect } from 'vitest'
import { applyBulk, buildPreview } from '../variant-matrix'
import type { Axis } from '../variant-matrix'

const size: Axis = {
  attributeId: 'a-size',
  attributeCode: 'SIZE',
  attributeName: 'Size',
  values: ['S', 'M', 'L'].map((v) => ({ id: `s-${v}`, value: v, code: v })),
}
const color: Axis = {
  attributeId: 'a-color',
  attributeCode: 'COLOR',
  attributeName: 'Màu',
  values: [
    { id: 'c-d', value: 'Đen', code: 'DEN' },
    { id: 'c-t', value: 'Trắng', code: 'TRANG' },
  ],
}
const base = { productCode: 'AO01', productName: 'Áo thun', axes: [color, size], existing: [], defaultSale: '100000', defaultCost: '' }

describe('variant matrix', () => {
  it('3 size × 2 màu → 6 dòng với SKU PRODUCT-COLOR-SIZE', () => {
    const rows = buildPreview(base)
    expect(rows).toHaveLength(6)
    expect(rows[0].sku).toBe('AO01-DEN-S')
    expect(rows[0].name).toBe('Áo thun Đen S')
  })

  it('áp giá hàng loạt toàn bộ hoặc theo một giá trị', () => {
    const rows = buildPreview(base)
    expect(applyBulk(rows, 'salePrice', '5').every((r) => r.salePrice === '5')).toBe(true)
    const m = applyBulk(rows, 'costPrice', '7', 's-M')
    expect(m.filter((r) => r.costPrice === '7')).toHaveLength(2)
  })

  it('thêm size mới cho SP cũ: dòng có sẵn giữ id, chỉ dòng thiếu là mới', () => {
    const first = buildPreview({ ...base, axes: [color, { ...size, values: size.values.slice(0, 2) }] })
    const existing = first.map((r) => ({
      id: `i-${r.key}`,
      name: r.name,
      sku: r.sku,
      barcode: null,
      variantKey: r.key,
      salePrice: '100000',
      costPerUnit: '0',
    }))
    const rows = buildPreview({ ...base, existing })
    expect(rows).toHaveLength(6)
    expect(rows.filter((r) => !r.existingId)).toHaveLength(2)
  })

  it('giữ giá đã sửa khi ma trận đổi', () => {
    const rows = applyBulk(buildPreview(base), 'salePrice', '9')
    const next = buildPreview({ ...base, productName: 'Áo polo' }, rows)
    expect(next[0].salePrice).toBe('9')
    expect(next[0].name).toBe('Áo polo Đen S')
  })
})
