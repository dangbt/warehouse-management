import type { Dispatch, SetStateAction } from 'react'
import { mergeLines, type MatrixLine } from '@/components/matrix-picker/matrix-logic'
import type { ScannedItem } from '@/components/barcode/lookup'
import type { IngredientOption } from './import-order-items-table'

interface Line {
  ingredient_id: string
  quantity: number
  factor: number
  unit_price: number
  vat_rate?: string
  expiry_date?: string
}

interface Deps {
  getValues: () => Line[]
  replace: (rows: Line[]) => void
  setIngredients: Dispatch<SetStateAction<IngredientOption[]>>
  setUnitMap: Dispatch<SetStateAction<Record<string, string>>>
  setGroupMap: Dispatch<SetStateAction<Record<string, { product: string; variant: string }>>>
  defaultVat: string
}

/** Thêm dòng vào phiếu nhập từ MatrixPicker hoặc từ quét mã; trùng mã hàng thì cộng dồn số lượng. */
export function makeLineAdders({ getValues, replace, setIngredients, setUnitMap, setGroupMap, defaultVat }: Deps) {
  const blank = { ingredient_id: '', quantity: 0, factor: 1, unit_price: 0, vat_rate: defaultVat, expiry_date: '' }

  const addMatrixLines = (lines: MatrixLine[]) => {
    const current = getValues().filter((r) => r.ingredient_id)
    const incoming = lines.map((l) => ({
      itemId: l.itemId,
      quantity: l.quantity,
      ingredient_id: l.itemId,
      factor: 1,
      unit_price: l.unitPrice,
      vat_rate: defaultVat,
      expiry_date: '',
    }))
    const merged = mergeLines(current.map((r) => ({ ...r, itemId: r.ingredient_id })), incoming).map(({ itemId: _id, ...r }) => r)
    replace(merged)
    setIngredients((o) => [
      ...o,
      ...lines.filter((l) => !o.some((x) => x.value === l.itemId)).map((l) => ({ value: l.itemId, label: l.sku ? `${l.sku} · ${l.productName} ${l.variantLabel}` : `${l.productName} ${l.variantLabel}`, unit: l.unit })),
    ])
    setUnitMap((m) => ({ ...m, ...Object.fromEntries(lines.map((l) => [l.itemId, l.unit])) }))
    setGroupMap((g) => ({ ...g, ...Object.fromEntries(lines.map((l) => [l.itemId, { product: l.productName, variant: l.variantLabel }])) }))
  }

  /** Quét ra hàng: đã có dòng → +1 số lượng; chưa có → thêm dòng SL 1. Trả thông báo để hiện cho người dùng. */
  const addScanned = (item: ScannedItem): string => {
    const rows = getValues()
    const idx = rows.findIndex((r) => r.ingredient_id === item.id)
    if (idx >= 0) {
      const qty = Number(rows[idx].quantity) + 1
      replace(rows.map((r, i) => (i === idx ? { ...r, quantity: qty } : r)))
      return `${item.name}: SL ${qty}`
    }
    const rest = rows.filter((r) => r.ingredient_id) // bỏ dòng trống mặc định
    replace([...rest, { ...blank, ingredient_id: item.id, quantity: 1 }])
    setIngredients((o) => (o.some((x) => x.value === item.id) ? o : [...o, { value: item.id, label: item.name, unit: item.unit }]))
    setUnitMap((m) => ({ ...m, [item.id]: item.unit }))
    return `+ ${item.name}`
  }

  return { addMatrixLines, addScanned }
}
