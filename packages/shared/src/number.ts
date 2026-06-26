export function formatNumber(value: number | string | null | undefined, decimals?: number): string {
  const num = Number(value ?? 0)
  if (isNaN(num)) return '0'
  return num.toLocaleString('vi-VN', decimals !== undefined ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : undefined)
}

export function formatCurrency(value: number | string | null | undefined): string {
  return formatNumber(value) + '₫'
}
