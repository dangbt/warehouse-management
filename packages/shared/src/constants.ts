export const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'gram' },
  { value: 'lít', label: 'lít' },
  { value: 'ml', label: 'ml' },
  { value: 'cái', label: 'cái' },
  { value: 'quả', label: 'quả' },
  { value: 'bó', label: 'bó' },
  { value: 'hộp', label: 'hộp' },
  { value: 'chai', label: 'chai' },
  { value: 'gói', label: 'gói' },
  { value: 'lon', label: 'lon' },
  { value: 'phần', label: 'phần' },
  { value: 'thùng', label: 'thùng' },
] as const

export const STOCK_EXPORT_REASONS = [
  { value: 'DAMAGED', label: 'Hỏng' },
  { value: 'EXPIRED', label: 'Hết hạn' },
  { value: 'RETURN', label: 'Trả NCC' },
  { value: 'INTERNAL_USE', label: 'Sử dụng nội bộ' },
  { value: 'OTHER', label: 'Khác' },
] as const

export const INGREDIENT_CATEGORIES = [
  { value: 'Thịt', label: 'Thịt' },
  { value: 'Rau', label: 'Rau' },
  { value: 'Gia vị', label: 'Gia vị' },
  { value: 'Đồ khô', label: 'Đồ khô' },
  { value: 'Đồ uống', label: 'Đồ uống' },
] as const

export const IMPORT_ORDER_STATUSES = {
  PENDING: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Từ chối', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Đã huỷ', color: 'bg-gray-100 text-gray-600' },
} as const

export const TRANSACTION_TYPES = {
  IMPORT: { label: 'Nhập', color: 'bg-green-100 text-green-800' },
  EXPORT: { label: 'Xuất', color: 'bg-red-100 text-red-800' },
  ORDER_DEDUCT: { label: 'Trừ kho', color: 'bg-orange-100 text-orange-800' },
  ORDER_RESTORE: { label: 'Hoàn', color: 'bg-blue-100 text-blue-800' },
} as const

export const VAT_RATES = ['0', '5', '8', '10', 'KCT', 'KKKNT'] as const

export type VatRate = (typeof VAT_RATES)[number]

export const VAT_RATE_LABELS: Record<VatRate, string> = {
  '0': '0%',
  '5': '5%',
  '8': '8%',
  '10': '10%',
  KCT: 'Không chịu thuế',
  KKKNT: 'Không kê khai, tính nộp',
}

/**
 * Trả về phần trăm thuế suất VAT dưới dạng số.
 * Các mã không chịu thuế (`0`, `KCT`, `KKKNT`) trả về 0.
 */
export function vatRatePercent(rate: VatRate): number {
  switch (rate) {
    case '5':
      return 5
    case '8':
      return 8
    case '10':
      return 10
    case '0':
    case 'KCT':
    case 'KKKNT':
    default:
      return 0
  }
}

export const TAX_REGIMES = ['VAT_DEDUCTION', 'HOUSEHOLD'] as const

export type TaxRegime = (typeof TAX_REGIMES)[number]

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  VAT_DEDUCTION: 'Doanh nghiệp – khấu trừ',
  HOUSEHOLD: 'Hộ kinh doanh – kê khai',
}

export const TAX_PERIOD_TYPES = ['MONTH', 'QUARTER'] as const

export type TaxPeriodType = (typeof TAX_PERIOD_TYPES)[number]

export const TAX_PERIOD_TYPE_LABELS: Record<TaxPeriodType, string> = {
  MONTH: 'Theo tháng',
  QUARTER: 'Theo quý',
}
