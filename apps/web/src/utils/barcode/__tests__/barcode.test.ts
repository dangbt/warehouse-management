import { describe, it, expect } from 'vitest'
import { BinaryBitmap, HybridBinarizer, MultiFormatReader, RGBLuminanceSource, BarcodeFormat, DecodeHintType } from '@zxing/library'
import { encodeBarcode, encodeCode128, generateInternalEan13, isValidEan13 } from '..'

const SCALE = 3
const QUIET = 10

/** Vẽ chuỗi module thành ảnh xám rồi giải mã bằng zxing — chứng minh mã quét được. */
function decode(modules: string, format: BarcodeFormat): string {
  const w = (modules.length + QUIET * 2) * SCALE
  const h = 40
  const px = new Uint8ClampedArray(w * h).fill(255)
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] !== '1') continue
    for (let y = 0; y < h; y++) for (let s = 0; s < SCALE; s++) px[y * w + (i + QUIET) * SCALE + s] = 0
  }
  const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [format]]])
  const reader = new MultiFormatReader()
  reader.setHints(hints)
  return reader.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(px, w, h)))).getText()
}

describe('EAN-13', () => {
  it('sinh mã nội bộ tiền tố 2 và đúng số kiểm', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInternalEan13()
      expect(code).toMatch(/^2\d{12}$/)
      expect(isValidEan13(code)).toBe(true)
    }
  })

  it('từ chối số kiểm sai', () => {
    expect(isValidEan13('4006381333931')).toBe(true)
    expect(isValidEan13('4006381333932')).toBe(false)
  })

  it('giải mã lại đúng giá trị', () => {
    for (const code of ['4006381333931', generateInternalEan13(), generateInternalEan13()]) {
      expect(decode(encodeBarcode(code), BarcodeFormat.EAN_13)).toBe(code)
    }
  })
})

describe('Code128', () => {
  it('mỗi ký hiệu dài 11 module (stop 13)', () => {
    const m = encodeCode128('AB')
    expect(m.length).toBe(11 * 4 + 13) // start + 2 ký tự + check + stop
  })

  it('giải mã lại đúng mã NL', () => {
    for (const text of ['NL-0001', 'THIT-BO 500g', 'a~Z 09']) {
      expect(decode(encodeBarcode(text), BarcodeFormat.CODE_128)).toBe(text)
    }
  })

  it('báo lỗi với ký tự ngoài dải', () => {
    expect(() => encodeCode128('Thịt')).toThrow()
    expect(() => encodeCode128('')).toThrow()
  })
})
