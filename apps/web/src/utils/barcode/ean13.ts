const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

/** Chữ số kiểm của 12 chữ số đầu. */
export function ean13CheckDigit(first12: string): number {
  let s = 0
  for (let i = 0; i < 12; i++) s += Number(first12[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (s % 10)) % 10
}

export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12])
}

/** EAN-13 nội bộ: tiền tố 2 (dải 200–299 dành cho dùng nội bộ) + 11 chữ số ngẫu nhiên + số kiểm. */
export function generateInternalEan13(random: () => number = Math.random): string {
  let body = '2'
  for (let i = 0; i < 11; i++) body += Math.floor(random() * 10)
  return body + ean13CheckDigit(body)
}

/** EAN-13 → chuỗi module 95 ký tự '1'/'0'. */
export function encodeEan13(code: string): string {
  if (!isValidEan13(code)) throw new Error('EAN-13 không hợp lệ')
  const parity = PARITY[Number(code[0])]
  let out = '101'
  for (let i = 0; i < 6; i++) out += (parity[i] === 'L' ? L : G)[Number(code[i + 1])]
  out += '01010'
  for (let i = 7; i < 13; i++) out += R[Number(code[i])]
  return out + '101'
}
