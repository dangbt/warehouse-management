import { describe, expect, it } from 'vitest'
import { amountInWords } from '../amount-in-words'

describe('amountInWords', () => {
  it('đọc 0', () => expect(amountInWords(0)).toBe('Không đồng'))
  it('đọc 1.000.000', () => expect(amountInWords(1_000_000)).toBe('Một triệu đồng'))
  it('đọc 1.250.500', () => expect(amountInWords(1_250_500)).toBe('Một triệu hai trăm năm mươi nghìn năm trăm đồng'))
  it('đọc lẻ / mốt / lăm / mười', () => {
    expect(amountInWords(1_005)).toBe('Một nghìn không trăm lẻ năm đồng')
    expect(amountInWords(21)).toBe('Hai mươi mốt đồng')
    expect(amountInWords(15)).toBe('Mười lăm đồng')
    expect(amountInWords(105_000)).toBe('Một trăm lẻ năm nghìn đồng')
  })
  it('làm tròn số lẻ đến đồng, nhận chuỗi decimal', () => {
    expect(amountInWords(1234.56)).toBe('Một nghìn hai trăm ba mươi lăm đồng')
    expect(amountInWords('2500.40')).toBe('Hai nghìn năm trăm đồng')
  })
  it('đọc hàng tỷ', () => expect(amountInWords(2_000_000_000)).toBe('Hai tỷ đồng'))
  it('đọc từ nghìn tỷ trở lên', () => {
    expect(amountInWords(1_000_000_000_000)).toBe('Một nghìn tỷ đồng')
    expect(amountInWords(1_500_000_000_000)).toBe('Một nghìn năm trăm tỷ đồng')
  })
  it('xử lý null/âm', () => {
    expect(amountInWords(null)).toBe('Không đồng')
    expect(amountInWords(-5)).toBe('Âm năm đồng')
  })
})
