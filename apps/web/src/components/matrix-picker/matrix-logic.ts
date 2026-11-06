/** Hàm thuần cho MatrixPicker: dựng lưới màu × size từ biến thể, thu thập dòng chứng từ, gộp dòng. */
import type { ProductDetail, ProductAttribute } from '@/data/use-products'

export type MatrixMode = 'import' | 'export' | 'stocktake' | 'return'

export interface MatrixAxisValue {
  id: string
  label: string
}

export interface MatrixVariant {
  itemId: string
  name: string
  sku: string | null
  unit: string
  stock: number
  costPrice: number
  rowId: string
  colId: string
}

export interface MatrixModel {
  rows: MatrixAxisValue[]
  cols: MatrixAxisValue[]
  /** khoá `${rowId}|${colId}` */
  cells: Record<string, MatrixVariant | undefined>
}

export interface MatrixLine {
  itemId: string
  productName: string
  variantLabel: string
  sku: string | null
  unit: string
  quantity: number
  unitPrice: number
}

export const cellKey = (rowId: string, colId: string) => `${rowId}|${colId}`
const NONE: MatrixAxisValue = { id: '_', label: '' }
const COLOR_RE = /^(color|colour|mau)/i

/** Trục hàng = màu (nếu nhận ra), trục cột = trục còn lại (size). 1 trục → chỉ có cột. */
export function buildMatrixModel(product: ProductDetail, attrs: ProductAttribute[]): MatrixModel {
  const axisIds = [...product.attributes].sort((a, b) => a.sort - b.sort).map((a) => a.attributeId)
  const axes = axisIds.map((id) => attrs.find((a) => a.id === id)).filter((a): a is ProductAttribute => !!a)
  const colorIdx = axes.findIndex((a) => COLOR_RE.test(a.code))
  const rowAxis = axes.length >= 2 ? axes[colorIdx >= 0 ? colorIdx : 0] : undefined
  const colAxis = axes.length >= 2 ? axes.find((a) => a !== rowAxis) : axes[0]
  const valuesOf = (a?: ProductAttribute): MatrixAxisValue[] =>
    a ? [...a.values].sort((x, y) => x.sort - y.sort).map((v) => ({ id: v.id, label: v.value })) : []

  const cells: MatrixModel['cells'] = {}
  const items = product.items.filter((i) => i.isActive)
  for (const it of items) {
    const vals = it.attributeValues ?? []
    const pick = (a?: ProductAttribute) => (a ? vals.find((v) => v.attributeId === a.id)?.attributeValueId : undefined)
    const rowId = rowAxis ? (pick(rowAxis) ?? NONE.id) : NONE.id
    const colId = colAxis ? (pick(colAxis) ?? NONE.id) : it.id // SP không thuộc tính: mỗi item là 1 cột
    cells[cellKey(rowId, colId)] = {
      itemId: it.id,
      name: it.name,
      sku: it.sku,
      unit: it.unit,
      stock: Number(it.currentStock) || 0,
      costPrice: Number(it.costPerUnit) || 0,
      rowId,
      colId,
    }
  }
  const used = Object.values(cells).filter((c): c is MatrixVariant => !!c)
  const hasCol = (id: string) => used.some((c) => c.colId === id)
  const hasRow = (id: string) => used.some((c) => c.rowId === id)
  let cols = valuesOf(colAxis).filter((c) => hasCol(c.id))
  if (!colAxis) cols = used.map((c) => ({ id: c.colId, label: c.name }))
  else if (used.some((c) => c.colId === NONE.id)) cols = [...cols, NONE]
  let rows = valuesOf(rowAxis).filter((r) => hasRow(r.id))
  if (!rowAxis || used.some((c) => c.rowId === NONE.id)) rows = [...rows, NONE]
  return { rows, cols, cells }
}

export const variantLabel = (v: MatrixVariant, productName: string) => {
  const label = v.name.startsWith(productName) ? v.name.slice(productName.length).trim() : v.name
  return label || v.sku || v.name
}

export interface CollectInput {
  model: MatrixModel
  productName: string
  mode: MatrixMode
  qty: Record<string, string>
  /** giá riêng theo itemId (chuỗi nhập); trống → dùng giá chung */
  prices: Record<string, string>
  sharedPrice: number
}

export interface CollectResult {
  lines: MatrixLine[]
  /** lỗi theo itemId (vượt tồn khi xuất) */
  errors: Record<string, string>
}

/** Bỏ ô trống/0, báo lỗi ô vượt tồn khi xuất; mỗi biến thể 1 dòng. */
export function collectLines(input: CollectInput): CollectResult {
  const { model, productName, mode, qty, prices, sharedPrice } = input
  const lines: MatrixLine[] = []
  const errors: Record<string, string> = {}
  for (const row of model.rows) {
    for (const col of model.cols) {
      const v = model.cells[cellKey(row.id, col.id)]
      if (!v) continue
      const q = Number(qty[v.itemId])
      if (!(q > 0)) continue
      if (mode === 'export' && q > v.stock) {
        errors[v.itemId] = `Vượt tồn (${v.stock})`
        continue
      }
      const own = prices[v.itemId]
      const unitPrice = own !== undefined && own !== '' ? Number(own) || 0 : sharedPrice
      lines.push({ itemId: v.itemId, productName, variantLabel: variantLabel(v, productName), sku: v.sku, unit: v.unit, quantity: q, unitPrice })
    }
  }
  return { lines, errors }
}

/** Gộp dòng mới vào danh sách hiện có theo itemId: trùng → cộng dồn số lượng, giá lấy theo dòng mới. */
export function mergeLines<T extends { itemId: string; quantity: number }>(existing: T[], incoming: T[]): T[] {
  const out = existing.map((l) => ({ ...l }))
  for (const inc of incoming) {
    const hit = out.find((l) => l.itemId === inc.itemId)
    if (hit) {
      hit.quantity += inc.quantity
      Object.assign(hit, { ...inc, quantity: hit.quantity })
    } else out.push({ ...inc })
  }
  return out
}

export const rowTotal = (model: MatrixModel, rowId: string, qty: Record<string, string>) =>
  model.cols.reduce((s, c) => s + (Number(qty[model.cells[cellKey(rowId, c.id)]?.itemId ?? '']) || 0), 0)
export const colTotal = (model: MatrixModel, colId: string, qty: Record<string, string>) =>
  model.rows.reduce((s, r) => s + (Number(qty[model.cells[cellKey(r.id, colId)]?.itemId ?? '']) || 0), 0)
