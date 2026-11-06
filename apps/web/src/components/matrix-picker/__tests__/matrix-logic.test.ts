import { describe, it, expect } from 'vitest'
import { buildMatrixModel, collectLines, mergeLines, cellKey } from '../matrix-logic'
import type { ProductDetail, ProductAttribute } from '@/data/use-products'

const attrs: ProductAttribute[] = [
  { id: 'a-c', name: 'Màu', code: 'COLOR', sort: 0, values: [{ id: 'c1', attributeId: 'a-c', value: 'Đen', code: 'DEN', sort: 0 }, { id: 'c2', attributeId: 'a-c', value: 'Trắng', code: 'TR', sort: 1 }] },
  { id: 'a-s', name: 'Size', code: 'SIZE', sort: 1, values: ['S', 'M', 'L'].map((v, i) => ({ id: `s${i}`, attributeId: 'a-s', value: v, code: v, sort: i })) },
]
const items = ['c1', 'c2'].flatMap((c) =>
  ['s0', 's1', 's2'].map((s) => ({
    id: `${c}-${s}`, name: `Áo thun ${c} ${s}`, sku: `AO-${c}-${s}`, barcode: null, variantKey: null, unit: 'cái', currentStock: '5', costPerUnit: '100',
    salePrice: null, isActive: true, attributeValues: [{ attributeId: 'a-c', attributeValueId: c }, { attributeId: 'a-s', attributeValueId: s }],
  })),
)
const product = { id: 'p', code: 'AO', name: 'Áo thun', attributes: [{ attributeId: 'a-s', sort: 1 }, { attributeId: 'a-c', sort: 0 }], items } as unknown as ProductDetail
const model = buildMatrixModel(product, attrs)
const base = { model, productName: 'Áo thun', prices: {}, sharedPrice: 50 }

describe('matrix logic', () => {
  it('hàng = màu, cột = size', () => {
    expect(model.rows.map((r) => r.label)).toEqual(['Đen', 'Trắng'])
    expect(model.cols.map((c) => c.label)).toEqual(['S', 'M', 'L'])
    expect(model.cells[cellKey('c1', 's2')]?.itemId).toBe('c1-s2')
  })
  it('bỏ ô trống/0, mỗi biến thể 1 dòng, giá riêng ghi đè giá chung', () => {
    const r = collectLines({ ...base, mode: 'import', qty: { 'c1-s0': '2', 'c1-s1': '0', 'c2-s2': '3' }, prices: { 'c2-s2': '70' } })
    expect(r.lines.map((l) => [l.itemId, l.quantity, l.unitPrice])).toEqual([['c1-s0', 2, 50], ['c2-s2', 3, 70]])
  })
  it('xuất kho: chặn ô vượt tồn', () => {
    const r = collectLines({ ...base, mode: 'export', qty: { 'c1-s0': '6', 'c1-s1': '5' } })
    expect(r.errors['c1-s0']).toMatch(/Vượt tồn/)
    expect(r.lines.map((l) => l.itemId)).toEqual(['c1-s1'])
  })
  it('nhập kho không chặn theo tồn', () => {
    expect(collectLines({ ...base, mode: 'import', qty: { 'c1-s0': '99' } }).lines).toHaveLength(1)
  })
  it('gộp dòng: trùng itemId cộng dồn số lượng', () => {
    const merged = mergeLines([{ itemId: 'a', quantity: 2 }], [{ itemId: 'a', quantity: 3 }, { itemId: 'b', quantity: 1 }])
    expect(merged).toEqual([{ itemId: 'a', quantity: 5 }, { itemId: 'b', quantity: 1 }])
  })
})
