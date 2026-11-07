interface CountRow {
  ingredientId: string
  systemQty: number
  actualQty: number
  difference: number
}

/** Quét 1 lần = đếm thêm 1 đơn vị cho hàng đó; trả null nếu hàng không thuộc phiên kiểm kê. */
export function bumpActual<T extends CountRow>(rows: T[], ingredientId: string): T[] | null {
  const idx = rows.findIndex((r) => r.ingredientId === ingredientId)
  if (idx < 0) return null
  return rows.map((r, i) => {
    if (i !== idx) return r
    const actual = r.actualQty + 1
    return { ...r, actualQty: actual, difference: actual - r.systemQty }
  })
}
