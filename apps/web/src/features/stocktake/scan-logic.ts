interface CountRow {
  ingredientId: string
  systemQty: number
  actualQty: number
  difference: number
}

/**
 * Quét 1 lần = đếm thêm 1 đơn vị cho hàng đó; trả null nếu hàng không thuộc phiên kiểm kê.
 * actualQty được điền sẵn = tồn hệ thống nên lần quét ĐẦU của dòng trong phiên đặt về 1 (không cộng vào tồn),
 * các lần sau mới +1. `counted` là tập id đã quét (hàm tự thêm id vào).
 */
export function bumpActual<T extends CountRow>(rows: T[], ingredientId: string, counted: Set<string>): T[] | null {
  const idx = rows.findIndex((r) => r.ingredientId === ingredientId)
  if (idx < 0) return null
  const first = !counted.has(ingredientId)
  counted.add(ingredientId)
  return rows.map((r, i) => {
    if (i !== idx) return r
    const actual = first ? 1 : r.actualQty + 1
    return { ...r, actualQty: actual, difference: actual - r.systemQty }
  })
}
