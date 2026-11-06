/** Hàm thuần cho lưới biến thể: tích Descartes + SKU (khớp với apps/api/.../products/sku.ts) + áp giá hàng loạt. */

export interface AxisValue {
  id: string
  value: string
  code: string
}
export interface Axis {
  attributeId: string
  attributeCode: string
  attributeName: string
  values: AxisValue[]
}

export interface VariantRow {
  key: string
  picks: AxisValue[]
  sku: string
  name: string
  salePrice: string
  costPrice: string
  barcode: string
  /** có = biến thể đã tồn tại (id item), không = sẽ được sinh mới */
  existingId?: string
  /** người dùng đã tự sửa SKU/tên → không tự sinh lại khi mã/tên SP đổi */
  touched?: boolean
  /** giá trị gốc khi nạp, để chỉ PUT những dòng đã sửa */
  original?: Pick<VariantRow, 'sku' | 'name' | 'salePrice' | 'costPrice' | 'barcode'>
}

export function toCode(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const DEFAULT_SKU_TEMPLATE = '{PRODUCT}-{COLOR}-{SIZE}'

export function comboKey(pairs: { attributeId: string; valueId: string }[]): string {
  return [...pairs]
    .sort((a, b) => a.attributeId.localeCompare(b.attributeId))
    .map((p) => `${p.attributeId}:${p.valueId}`)
    .join('|')
}

export function buildCombos(axes: Axis[]): { picks: AxisValue[]; key: string }[] {
  const active = axes.filter((a) => a.values.length > 0)
  if (active.length === 0) return []
  let acc: AxisValue[][] = [[]]
  for (const axis of active) acc = acc.flatMap((prefix) => axis.values.map((v) => [...prefix, v]))
  return acc.map((picks) => ({
    picks,
    key: comboKey(picks.map((v, i) => ({ attributeId: active[i].attributeId, valueId: v.id }))),
  }))
}

export function buildSku(productCode: string, axes: Axis[], picks: AxisValue[], template?: string | null): string {
  const active = axes.filter((a) => a.values.length > 0)
  const byAttr = new Map<string, string>()
  picks.forEach((v, i) => byAttr.set(active[i].attributeCode, v.code))
  const used = new Set<string>()
  let sku = (template || DEFAULT_SKU_TEMPLATE).replace(/\{([A-Za-z0-9_]+)\}/g, (_m, token: string) => {
    const t = token.toUpperCase()
    if (t === 'PRODUCT') return productCode
    used.add(t)
    return byAttr.get(t) ?? ''
  })
  for (const [attr, code] of byAttr) if (!used.has(attr)) sku += `-${code}`
  return toCode(sku)
}

export interface ExistingItem {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  variantKey: string | null
  salePrice: string | null
  costPerUnit: string
}

export interface PreviewInput {
  productCode: string
  productName: string
  skuTemplate?: string | null
  axes: Axis[]
  existing: ExistingItem[]
  defaultSale: string
  defaultCost: string
}

/** Dựng các dòng xem trước; giữ lại chỉnh sửa của người dùng (theo key) khi ma trận đổi. */
export function buildPreview(input: PreviewInput, previous: VariantRow[] = []): VariantRow[] {
  const prev = new Map(previous.map((r) => [r.key, r]))
  const byKey = new Map(input.existing.filter((e) => e.variantKey).map((e) => [e.variantKey as string, e]))
  return buildCombos(input.axes).map(({ picks, key }) => {
    const found = byKey.get(key)
    let row: VariantRow
    if (found) {
      const base = {
        sku: found.sku ?? '',
        name: found.name,
        salePrice: found.salePrice ?? '',
        costPrice: found.costPerUnit ?? '',
        barcode: found.barcode ?? '',
      }
      row = { key, picks, ...base, existingId: found.id, original: base }
    } else {
      row = {
        key,
        picks,
        sku: buildSku(input.productCode, input.axes, picks, input.skuTemplate),
        name: [input.productName, ...picks.map((p) => p.value)].join(' '),
        salePrice: input.defaultSale,
        costPrice: input.defaultCost,
        barcode: '',
      }
    }
    const kept = prev.get(key)
    if (!kept) return row
    // Giữ giá/mã vạch người dùng đã nhập; SKU/tên chỉ giữ khi đã tự sửa (hoặc là biến thể có sẵn)
    const keepText = kept.touched || !!row.existingId
    return {
      ...row,
      salePrice: kept.salePrice,
      costPrice: kept.costPrice,
      barcode: kept.barcode,
      sku: keepText ? kept.sku : row.sku,
      name: keepText ? kept.name : row.name,
      touched: kept.touched,
    }
  })
}

export type BulkField = 'salePrice' | 'costPrice'

/** Áp một giá trị cho cả cột; `valueId` giới hạn vào hàng/cột của ma trận (vd chỉ size M). */
export function applyBulk(rows: VariantRow[], field: BulkField, value: string, valueId?: string): VariantRow[] {
  return rows.map((r) => (!valueId || r.picks.some((p) => p.id === valueId) ? { ...r, [field]: value } : r))
}

export function isDirty(r: VariantRow): boolean {
  const o = r.original
  return !!o && (o.sku !== r.sku || o.name !== r.name || o.salePrice !== r.salePrice || o.costPrice !== r.costPrice || o.barcode !== r.barcode)
}

export function numOrUndef(s: string): number | undefined {
  if (s.trim() === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}
