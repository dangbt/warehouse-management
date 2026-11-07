export type LabelSize = 'decal' | 'a4'

/** Khổ tem: decal cuộn 40×30mm (1 tem/trang) hoặc A4 lưới 3×8 tem 70×37mm. */
export const LABEL_SIZES: Record<LabelSize, { label: string; w: number; h: number; perPage: number; page: string }> = {
  decal: { label: 'Decal 40×30mm', w: 40, h: 30, perPage: 1, page: '40mm 30mm' },
  a4: { label: 'A4 nhiều tem (3×8)', w: 70, h: 37, perPage: 24, page: 'A4 portrait' },
}

/** Chiều cao vùng in A4 (@page margin 0) và số hàng/cột của lưới A4 — rows*h phải ≤ A4_HEIGHT_MM. */
export const A4_HEIGHT_MM = 297
export const A4_GRID = { cols: 3, rows: 8 }

export interface LabelSource {
  id: string
  name: string
  unit: string
  sku?: string | null
  barcode?: string | null
}

export interface LabelData {
  key: string
  name: string
  unit: string
  /** Nội dung mã vạch: barcode, không có thì SKU. */
  code: string
}

/** Nhân bản mỗi hàng `copies` tem; bỏ hàng chưa có mã nào để in (trả về danh sách bị bỏ để cảnh báo). */
export function buildLabels(items: LabelSource[], copies: number): { labels: LabelData[]; missing: string[] } {
  const labels: LabelData[] = []
  const missing: string[] = []
  const n = Math.max(1, Math.min(500, Math.floor(copies) || 1))
  for (const it of items) {
    const code = (it.barcode || it.sku || '').trim()
    if (!code) {
      missing.push(it.name)
      continue
    }
    for (let i = 0; i < n; i++) labels.push({ key: `${it.id}-${i}`, name: it.name, unit: it.unit, code })
  }
  return { labels, missing }
}

/** Chia tem thành các trang (A4: 24 tem/trang; decal: 1 tem/trang). */
export function paginate<T>(list: T[], perPage: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < list.length; i += perPage) pages.push(list.slice(i, i + perPage))
  return pages
}
