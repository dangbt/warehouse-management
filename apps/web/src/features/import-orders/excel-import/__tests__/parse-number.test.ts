import { describe, expect, it } from 'vitest'
import { parseNumberCell, parseRows } from '../parse'
import { IMPORT_COLUMNS } from '../columns'

describe('parseNumberCell — số dạng text kiểu VN', () => {
  it('một dấu phân cách + đúng 3 chữ số là mơ hồ → NaN', () => {
    expect(parseNumberCell('250.000')).toBeNaN()
    expect(parseNumberCell('1.500')).toBeNaN()
    expect(parseNumberCell('1,500')).toBeNaN()
  })

  it('dạng rõ ràng vẫn đọc đúng', () => {
    expect(parseNumberCell('1.234.567')).toBe(1234567)
    expect(parseNumberCell('1,234,567')).toBe(1234567)
    expect(parseNumberCell('2,5')).toBe(2.5)
    expect(parseNumberCell('2.5')).toBe(2.5)
    expect(parseNumberCell('1.234,5')).toBe(1234.5)
    expect(parseNumberCell(250000)).toBe(250000)
  })

  it('ô text "250.000" ở cột Đơn giá bị báo lỗi dòng', () => {
    const header = IMPORT_COLUMNS.map((c) => c.header)
    const row = IMPORT_COLUMNS.map((c) => ({ partner: 'x', ingredient: 'y', quantity: 1, unitPrice: '250.000' })[c.key as string] ?? '')
    const rows = parseRows([header, row]).rows
    expect(rows[0].errors.join()).toMatch(/mơ hồ/)
  })
})
