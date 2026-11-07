import { encodeCode128 } from './code128'
import { encodeEan13, isValidEan13 } from './ean13'

export { generateInternalEan13, isValidEan13 } from './ean13'
export { encodeCode128 } from './code128'

/** Chọn định dạng theo nội dung: 13 chữ số đúng số kiểm → EAN-13, còn lại → Code128. */
export function encodeBarcode(value: string): string {
  return isValidEan13(value) ? encodeEan13(value) : encodeCode128(value)
}

/** Mã vạch Code128 theo mã nội bộ (SKU) của hàng: bỏ khoảng trắng đầu/cuối, in hoa. */
export function codeFromSku(sku: string): string {
  return sku.trim().toUpperCase()
}
