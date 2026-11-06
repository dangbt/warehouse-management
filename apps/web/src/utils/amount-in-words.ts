const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
const UNITS = ['', 'nghìn', 'triệu', 'tỷ']

/** Đọc nhóm 3 chữ số (0-999). `full` = có đứng sau nhóm khác (đọc "không trăm", "lẻ"). */
function readTriple(n: number, full: boolean): string {
  const hundred = Math.floor(n / 100)
  const ten = Math.floor((n % 100) / 10)
  const unit = n % 10
  const parts: string[] = []
  if (hundred > 0 || full) parts.push(`${DIGITS[hundred]} trăm`)
  if (ten > 1) parts.push(`${DIGITS[ten]} mươi`)
  else if (ten === 1) parts.push('mười')
  else if (unit > 0 && (hundred > 0 || full)) parts.push('lẻ')
  if (unit > 0) {
    if (ten > 1 && unit === 1) parts.push('mốt')
    else if (ten > 0 && unit === 5) parts.push('lăm')
    else parts.push(DIGITS[unit])
  }
  return parts.join(' ')
}

function readInteger(n: number): string {
  if (n === 0) return DIGITS[0]
  const groups: number[] = []
  let rest = n
  while (rest > 0) {
    groups.push(rest % 1000)
    rest = Math.floor(rest / 1000)
  }
  const parts: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i]
    if (g === 0) continue
    const full = i < groups.length - 1
    const unit = UNITS[i % 4] + (i >= 4 ? ' tỷ'.repeat(Math.floor(i / 4)) : '')
    parts.push([readTriple(g, full), unit.trim()].filter(Boolean).join(' '))
  }
  return parts.join(' ')
}

/**
 * Đọc số tiền VND bằng chữ: 1250500 → "Một triệu hai trăm năm mươi nghìn năm trăm đồng".
 * Số lẻ được làm tròn đến đồng; số âm có tiền tố "Âm".
 */
export function amountInWords(value: number | string | null | undefined): string {
  const num = Math.round(Number(value ?? 0))
  if (!Number.isFinite(num)) return 'Không đồng'
  const text = `${num < 0 ? 'âm ' : ''}${readInteger(Math.abs(num))} đồng`
  return text.charAt(0).toUpperCase() + text.slice(1)
}
