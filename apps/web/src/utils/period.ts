/** Kỳ lọc dùng chung cho danh sách chứng từ (theo ngày chứng từ, lịch VN). */
export const PERIOD_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year', label: 'Năm nay' },
  { value: 'custom', label: 'Tuỳ chọn' },
] as const

export interface PeriodRange {
  from?: string
  to?: string
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000

function ymd(y: number, m: number, d: number): string {
  // Date.UTC tự chuẩn hoá tháng/ngày tràn (vd tháng 0 - 1, ngày 0).
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
}

/** Quy kỳ + (từ–đến tuỳ chọn) ra khoảng YYYY-MM-DD theo lịch VN; server hiểu là biên ngày VN. */
export function resolvePeriod(period: string, from = '', to = '', now: Date = new Date()): PeriodRange {
  const vn = new Date(now.getTime() + VN_OFFSET_MS)
  const y = vn.getUTCFullYear()
  const m = vn.getUTCMonth()
  const d = vn.getUTCDate()
  switch (period) {
    case 'today':
      return { from: ymd(y, m, d), to: ymd(y, m, d) }
    case 'week': {
      const dow = vn.getUTCDay() || 7
      return { from: ymd(y, m, d - (dow - 1)), to: ymd(y, m, d + (7 - dow)) }
    }
    case 'month':
      return { from: ymd(y, m, 1), to: ymd(y, m + 1, 0) }
    case 'last_month':
      return { from: ymd(y, m - 1, 1), to: ymd(y, m, 0) }
    case 'quarter': {
      const qStart = Math.floor(m / 3) * 3
      return { from: ymd(y, qStart, 1), to: ymd(y, qStart + 3, 0) }
    }
    case 'year':
      return { from: ymd(y, 0, 1), to: ymd(y, 11, 31) }
    case 'custom':
      return { from: from || undefined, to: to || undefined }
    default:
      return {}
  }
}
