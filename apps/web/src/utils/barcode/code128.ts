/** Bảng độ rộng vạch/khoảng trắng của Code128 (giá trị 0..105), mỗi mục 6 chữ số, tổng 11 module. */
const PATTERNS = (
  '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 ' +
  '123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 ' +
  '232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 ' +
  '313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 ' +
  '111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 ' +
  '114311 411113 411311 113141 114131 311141 411131 211412 211214 211232'
).split(' ')
const STOP = '2331112'
const START_B = 104

/** Code128 subset B (ASCII 32..126) → chuỗi module '1' (vạch) / '0' (trắng). Ném lỗi nếu có ký tự ngoài dải. */
export function encodeCode128(text: string): string {
  if (!text) throw new Error('Mã rỗng')
  const codes = [START_B]
  let sum = START_B
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) - 32
    if (c < 0 || c > 94) throw new Error(`Ký tự "${text[i]}" không in được bằng Code128`)
    codes.push(c)
    sum += c * (i + 1)
  }
  codes.push(sum % 103)
  const widths = codes.map((c) => PATTERNS[c]).concat(STOP)
  return widths
    .map((w) => [...w].map((n, idx) => (idx % 2 === 0 ? '1' : '0').repeat(Number(n))).join(''))
    .join('')
}
