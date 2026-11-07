import { describe, expect, it } from 'vitest'
import { buildRows, lineKey } from '../to-rows'
import type { EinvoiceResult } from '../types'

const line = (stt: number, name: string, mapping: EinvoiceResult['invoice'] extends infer I ? unknown : never = null) => ({
  stt, name, unit: 'kg', quantity: 10, unitPrice: 100, amount: 1000, vatRate: '8', vatAmount: 80, discountAllocated: 0, mapping: mapping as never,
})
const inv = (fileName: string, extra: Partial<EinvoiceResult> = {}): EinvoiceResult => ({
  fileName,
  ok: true,
  supplier: { id: 's1', name: 'A' },
  invoice: {
    template: '1', symbol: 'C26TAA', invoiceNo: '9', invoiceDate: '2026-10-15',
    seller: { taxCode: '0312345678', name: 'A', address: '' },
    lines: [line(1, 'Thịt bò', { ingredientId: 'i1', factor: 2 }), line(2, 'Rau')],
    declared: { subtotal: 2000, vatAmount: 160, total: 2160 }, computed: { subtotal: 2000, vatAmount: 160, total: 2160 }, warnings: [],
  },
  ...extra,
})

describe('buildRows (HĐĐT → dòng như Excel)', () => {
  it('áp mapping đã nhớ: hệ số + nguyên liệu; đơn giá theo đơn vị tồn', () => {
    const { rows, seedMap } = buildRows([inv('a.xml')], {}, new Set())
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ partner: '0312345678', invoiceNo: '9', invoiceSymbol: 'C26TAA', vatRate: '8', factor: 2, unitPrice: 50 })
    expect(rows[1]).toMatchObject({ factor: 1, unitPrice: 100 })
    expect(seedMap).toEqual({ 'thit bo': 'i1' })
  })

  it('hệ số người dùng sửa ưu tiên hơn mapping; hoá đơn trùng/lỗi bị bỏ qua', () => {
    const { rows } = buildRows([inv('a.xml'), inv('b.xml', { duplicateOf: 'PN-1' }), { fileName: 'c.xml', ok: false }], { [lineKey('a.xml', 1)]: 5 }, new Set())
    expect(rows).toHaveLength(2)
    expect(rows[0].factor).toBe(5)
    expect(rows[0].unitPrice).toBe(20)
  })
})
