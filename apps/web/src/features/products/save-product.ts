import { fetchProduct, productApi, invalidateProducts } from '@/data/use-products'
import type { ProductInput, ProductItem } from '@/data/use-products'
import { numOrUndef } from './variant-matrix'
import type { VariantRow } from './variant-matrix'

export interface SaveProductArgs {
  productId?: string
  product: ProductInput & { code: string; name: string }
  selection: { attribute_id: string; value_ids: string[] }[]
  rows: VariantRow[]
}

/** Patch cần PUT cho 1 item để khớp dòng trên lưới (rỗng = không đổi). */
export function itemPatch(row: VariantRow, item: ProductItem) {
  const patch: { name?: string; sku?: string | null; barcode?: string | null; sale_price?: number | null; cost_per_unit?: number } = {}
  if (row.name && row.name !== item.name) patch.name = row.name
  if (row.sku !== (item.sku ?? '')) patch.sku = row.sku || null
  if (row.barcode !== (item.barcode ?? '')) patch.barcode = row.barcode || null
  const sale = numOrUndef(row.salePrice)
  if (sale !== (item.salePrice == null ? undefined : Number(item.salePrice))) patch.sale_price = sale ?? null
  const cost = numOrUndef(row.costPrice)
  if (cost !== undefined && cost !== Number(item.costPerUnit)) patch.cost_per_unit = cost
  return patch
}

/**
 * Lưu SP + sinh biến thể (chỉ sinh phần thiếu — API đồng bộ theo ma trận) rồi áp giá/mã vạch
 * từng dòng đã sửa lên mã hàng tương ứng (khớp theo variantKey).
 */
export async function saveProduct({ productId, product, selection, rows }: SaveProductArgs) {
  const saved = productId ? await productApi.update(productId, product) : await productApi.create(product)
  await productApi.generate(saved.id, { attributes: selection, unit: product.unit })
  const detail = await fetchProduct(saved.id)
  const byKey = new Map(detail.items.filter((i) => i.variantKey).map((i) => [i.variantKey as string, i]))
  for (const row of rows) {
    const item = byKey.get(row.key)
    if (!item) continue
    const patch = itemPatch(row, item)
    if (Object.keys(patch).length) await productApi.updateItem(item.id, patch)
  }
  invalidateProducts()
  return { id: saved.id, count: rows.length }
}
