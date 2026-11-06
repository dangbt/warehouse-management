const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

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

/** Đọc số < 1 tỷ. `full` = đứng sau phần tỷ nên nhóm đầu cũng đọc "không trăm"/"lẻ". */
function readBelowBillion(n: number, full: boolean): string {
  const groups = [Math.floor(n / 1_000_000), Math.floor(n / 1000) % 1000, n % 1000]
  const units = ['triệu', 'nghìn', '']
  const parts: string[] = []
  let started = full
  groups.forEach((g, i) => {
    if (g === 0) return
    parts.push([readTriple(g, started), units[i]].filter(Boolean).join(' '))
    started = true
  })
  return parts.join(' ')
}

function readInteger(n: number): string {
  if (n === 0) return DIGITS[0]
  const billions = Math.floor(n / 1_000_000_000)
  const rest = n % 1_000_000_000
  const head = billions > 0 ? `${readInteger(billions)} tỷ` : ''
  const tail = rest > 0 ? readBelowBillion(rest, billions > 0) : ''
  return [head, tail].filter(Boolean).join(' ')
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
