import { IMPORT_COLUMNS, MAX_IMPORT_ROWS, normalizeKey, type ColumnKey } from './columns'

/** Một dòng dữ liệu sau khi đọc từ Excel (chưa đối chiếu danh mục). */
export interface ParsedRow {
  /** Số dòng trong file Excel (dòng header = 1). */
  rowNo: number
  voucherDate: string
  voucherNo: string
  partner: string
  invoiceNo: string
  invoiceSymbol: string
  invoiceDate: string
  ingredient: string
  quantity: number | null
  factor: number | null
  unitPrice: number | null
  vatRate: string
  expiry: string
  note: string
  /** Lỗi định dạng ô (ngày sai, số sai). */
  errors: string[]
}

export interface ParseResult {
  rows: ParsedRow[]
  /** Lỗi cấp file (thiếu cột, quá 2.000 dòng...) — khi có thì không xem trước được. */
  fileError?: string
}

/** Ô exceljs → chuỗi (hỗ trợ rich text, công thức, hyperlink, Date). */
export function cellText(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return ''
  if (typeof v === 'object') {
    const o = v as { richText?: { text: string }[]; text?: unknown; result?: unknown }
    if (o.richText) return o.richText.map((r) => r.text).join('').trim()
    if (o.result != null) return cellText(o.result)
    if (o.text != null) return cellText(o.text)
    return ''
  }
  return String(v).trim()
}

const pad = (n: number) => String(n).padStart(2, '0')

function realDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

/** Ô ngày → 'YYYY-MM-DD'. Trả về '' nếu trống, null nếu sai định dạng. */
export function parseDateCell(v: unknown): string | null {
  if (v == null || v === '') return ''
  if (v instanceof Date) return isNaN(v.getTime()) ? null : realDate(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate())
  if (typeof v === 'number') {
    // Số seri Excel (1900 date system).
    const dt = new Date(Math.round((v - 25569) * 86400000))
    return v > 0 && !isNaN(dt.getTime()) ? realDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()) : null
  }
  const s = cellText(v)
  if (!s) return ''
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s)
  if (m) return realDate(+m[3], +m[2], +m[1])
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s)
  if (m) return realDate(+m[1], +m[2], +m[3])
  return null
}

/** Ô số → number. Trả về undefined nếu trống, NaN nếu sai. Hiểu "1.234,5", "1,234.5", "1.234.567"; dạng một dấu phân cách + đúng 3 chữ số ("250.000", "1,500") là mơ hồ → NaN (báo lỗi, yêu cầu nhập ô kiểu số). */
export function parseNumberCell(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  if (typeof v === 'number') return v
  let s = cellText(v).replace(/\s/g, '')
  if (!s) return undefined
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  if (lastDot >= 0 && lastComma >= 0) {
    const dec = lastDot > lastComma ? '.' : ','
    const thou = dec === '.' ? ',' : '.'
    s = s.split(thou).join('').replace(dec, '.')
  } else if (lastComma >= 0) {
    if (/^-?\d{1,3},\d{3}$/.test(s)) return NaN // "1,500": nghìn hay thập phân? → báo lỗi dòng
    s = /^-?\d{1,3}(,\d{3}){2,}$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.')
  } else if (lastDot >= 0) {
    if (/^-?\d{1,3}\.\d{3}$/.test(s)) return NaN // "250.000": mơ hồ (250 hay 250000) → báo lỗi dòng
    if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, '')
  }
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN
}

/** "8%", "kct" → mã thuế suất chuẩn ('8', 'KCT'); giữ nguyên nếu không nhận ra để validate báo lỗi. */
export function normalizeVatCell(v: unknown): string {
  const s = cellText(typeof v === 'number' ? String(v * (v > 0 && v < 1 ? 100 : 1)) : v)
    .replace('%', '')
    .trim()
    .toUpperCase()
  return s
}

const HEADER_INDEX = new Map(IMPORT_COLUMNS.map((c) => [normalizeKey(c.header), c.key]))

/**
 * Chuyển ma trận ô (dòng đầu là header) thành các ParsedRow.
 * Khớp cột theo tên header; bỏ qua dòng trống hoàn toàn.
 */
export function parseRows(matrix: unknown[][]): ParseResult {
  if (matrix.length === 0) return { rows: [], fileError: 'File không có dữ liệu' }
  const colOf = new Map<ColumnKey, number>()
  matrix[0].forEach((h, i) => {
    const key = HEADER_INDEX.get(normalizeKey(cellText(h)))
    if (key && !colOf.has(key)) colOf.set(key, i)
  })
  const missing = IMPORT_COLUMNS.filter((c) => c.required && !colOf.has(c.key)).map((c) => c.header)
  if (missing.length) return { rows: [], fileError: `Thiếu cột bắt buộc: ${missing.join(', ')}. Hãy dùng file mẫu.` }

  const get = (line: unknown[], key: ColumnKey) => {
    const idx = colOf.get(key)
    return idx == null ? undefined : line[idx]
  }
  const rows: ParsedRow[] = []
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i]
    if (!line || line.every((c) => cellText(c) === '' && !(c instanceof Date) && typeof c !== 'number')) continue
    if (rows.length >= MAX_IMPORT_ROWS) {
      return { rows: [], fileError: `File vượt quá ${MAX_IMPORT_ROWS.toLocaleString('vi-VN')} dòng. Hãy tách thành nhiều file.` }
    }
    const errors: string[] = []
    const date = (key: ColumnKey, label: string) => {
      const d = parseDateCell(get(line, key))
      if (d === null) errors.push(`${label} không hợp lệ (dùng dd/mm/yyyy)`)
      return d ?? ''
    }
    const num = (key: ColumnKey, label: string) => {
      const n = parseNumberCell(get(line, key))
      if (n !== undefined && Number.isNaN(n)) {
        errors.push(`${label} không phải số hoặc mơ hồ (hãy nhập ô kiểu số)`)
        return null
      }
      return n ?? null
    }
    rows.push({
      rowNo: i + 1,
      voucherDate: date('voucherDate', 'Ngày CT'),
      voucherNo: cellText(get(line, 'voucherNo')),
      partner: cellText(get(line, 'partner')),
      invoiceNo: cellText(get(line, 'invoiceNo')),
      invoiceSymbol: cellText(get(line, 'invoiceSymbol')),
      invoiceDate: date('invoiceDate', 'Ngày HĐ'),
      ingredient: cellText(get(line, 'ingredient')),
      quantity: num('quantity', 'Số lượng'),
      factor: num('factor', 'Hệ số'),
      unitPrice: num('unitPrice', 'Đơn giá'),
      vatRate: normalizeVatCell(get(line, 'vatRate')),
      expiry: date('expiry', 'HSD'),
      note: cellText(get(line, 'note')),
      errors,
    })
  }
  if (rows.length === 0) return { rows, fileError: 'File không có dòng dữ liệu nào' }
  return { rows }
}
