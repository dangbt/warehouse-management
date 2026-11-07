import { describe, it, expect } from 'vitest'
import { IMPORT_COLUMNS, MAX_IMPORT_ROWS } from '../columns'
import { parseDateCell, parseNumberCell, parseRows } from '../parse'
import { buildOrders, validateRows, type Catalog } from '../validate'

const header = IMPORT_COLUMNS.map((c) => c.header)
const line = (o: Partial<Record<(typeof IMPORT_COLUMNS)[number]['key'], unknown>>) => IMPORT_COLUMNS.map((c) => o[c.key] ?? '')
const catalog: Catalog = {
  suppliers: [
    { id: 's1', name: 'Công ty ABC', taxCode: '0312345678' },
    { id: 's2', name: 'Chợ Bến Thành' },
  ],
  ingredients: [
    { id: 'i1', name: 'Thịt bò' },
    { id: 'i2', name: 'Hành lá' },
  ],
}
const parse = (...lines: unknown[][]) => parseRows([header, ...lines]).rows

describe('parse', () => {
  it('đọc ngày/số nhiều định dạng', () => {
    expect(parseDateCell('07/11/2026')).toBe('2026-11-07')
    expect(parseDateCell('31/02/2026')).toBeNull()
    expect(parseDateCell(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05')
    expect(parseNumberCell('1.234,5')).toBe(1234.5)
    expect(parseNumberCell('1,234.5')).toBe(1234.5)
    expect(parseNumberCell('abc')).toBeNaN()
  })

  it('báo lỗi thiếu cột và quá 2.000 dòng', () => {
    expect(parseRows([['A', 'B']]).fileError).toMatch(/Thiếu cột/)
    const many = Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => line({ partner: 'x', ingredient: 'y', quantity: 1, unitPrice: 1 }))
    expect(parseRows([header, ...many]).fileError).toMatch(/vượt quá/)
  })

  it('ghi lỗi định dạng ô, bỏ dòng trống', () => {
    const rows = parse(line({ voucherDate: '99/99/2026', partner: 'x', ingredient: 'y', quantity: 'abc', unitPrice: 1 }), line({}))
    expect(rows).toHaveLength(1)
    expect(rows[0].errors).toHaveLength(2)
  })
})

describe('validateRows', () => {
  const ok = { partner: 'công ty abc', ingredient: 'thit bo', quantity: 2, unitPrice: 1000 }

  it('khớp NCC theo tên/MST và NL không dấu', () => {
    const r = validateRows(parse(line(ok), line({ ...ok, partner: '0312345678' })), catalog)
    expect(r.every((x) => x.allErrors.length === 0)).toBe(true)
  })

  it('báo NCC/NL không khớp, số âm, thiếu thuế khi có HĐ', () => {
    const [a, b, c] = validateRows(
      parse(
        line({ ...ok, partner: 'Lạ', ingredient: 'Cá' }),
        line({ ...ok, quantity: -1, unitPrice: -5 }),
        line({ ...ok, invoiceNo: '1' }),
      ),
      catalog,
    )
    expect(a.allErrors).toEqual(expect.arrayContaining(['NCC không tồn tại', 'NL không khớp danh mục']))
    expect(b.allErrors).toEqual(expect.arrayContaining(['Số lượng phải > 0', 'Đơn giá không được âm']))
    expect(c.allErrors.join()).toMatch(/Ngày HĐ/)
    expect(c.allErrors.join()).toMatch(/Thuế suất/)
  })

  it('map tay NL chưa khớp', () => {
    const rows = parse(line({ ...ok, ingredient: 'Cá' }))
    expect(validateRows(rows, catalog)[0].allErrors).not.toHaveLength(0)
    expect(validateRows(rows, catalog, { ca: 'i2' })[0].allErrors).toHaveLength(0)
  })

  it('NCC khác nhau cùng Số CT là lỗi', () => {
    const r = validateRows(parse(line({ ...ok, voucherNo: 'A' }), line({ ...ok, voucherNo: 'A', partner: 'Chợ Bến Thành' })), catalog)
    expect(r[1].allErrors.join()).toMatch(/NCC khác/)
  })
})

describe('buildOrders', () => {
  const ok = { partner: 'Công ty ABC', ingredient: 'Thịt bò', quantity: 1, unitPrice: 10, voucherDate: '07/11/2026' }

  it('gom theo Số CT', () => {
    const rows = validateRows(parse(line({ ...ok, voucherNo: 'A' }), line({ ...ok, voucherNo: 'A', ingredient: 'Hành lá' }), line({ ...ok, voucherNo: 'B' })), catalog)
    const orders = buildOrders(rows)
    expect(orders).toHaveLength(2)
    expect(orders[0].items).toHaveLength(2)
  })

  it('Số CT trống: mỗi NCC + ngày một phiếu', () => {
    const rows = validateRows(
      parse(line(ok), line({ ...ok, ingredient: 'Hành lá' }), line({ ...ok, voucherDate: '08/11/2026' }), line({ ...ok, partner: 'Chợ Bến Thành' })),
      catalog,
    )
    const orders = buildOrders(rows)
    expect(orders).toHaveLength(3)
    expect(orders[0].voucher_no).toBeUndefined()
    expect(orders[0].items).toHaveLength(2)
  })

  it('có Số HĐ thì kèm hoá đơn + thuế suất', () => {
    const rows = validateRows(parse(line({ ...ok, invoiceNo: '9', invoiceDate: '07/11/2026', vatRate: '8%' })), catalog)
    const [o] = buildOrders(rows)
    expect(o).toMatchObject({ has_invoice: true, invoice_no: '9', invoice_date: '2026-11-07' })
    expect(o.items[0].vat_rate).toBe('8')
  })
})
