import { api } from '@/services/api'

export interface ScannedItem {
  id: string
  name: string
  unit: string
  sku?: string | null
  barcode?: string | null
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase()

/** Chọn đúng hàng khớp mã (barcode hoặc SKU, không phân biệt hoa thường) trong kết quả tìm kiếm. */
export function pickExact(list: ScannedItem[], code: string): ScannedItem | null {
  const c = norm(code)
  return list.find((i) => norm(i.barcode) === c) ?? list.find((i) => norm(i.sku) === c) ?? null
}

/** Tra mã vạch/SKU → hàng. Trả null nếu không có (API search đã khớp sku + barcode). */
export async function findItemByCode(code: string): Promise<ScannedItem | null> {
  const clean = code.trim()
  if (!clean) return null
  const res = (await api.get(`/ingredients?limit=20&search=${encodeURIComponent(clean)}`)) as { data: ScannedItem[] }
  return pickExact(res.data, clean)
}
