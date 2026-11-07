import { VAT_RATES } from '@wms/shared'
import { normalizeKey } from './columns'
import type { ParsedRow } from './parse'

export interface SupplierRef {
  id: string
  name: string
  taxCode?: string | null
}
export interface IngredientRef {
  id: string
  name: string
  unit?: string
}
export interface Catalog {
  suppliers: SupplierRef[]
  ingredients: IngredientRef[]
}

/** Dòng đã đối chiếu danh mục + kiểm lỗi. */
export interface PreviewRow extends ParsedRow {
  supplierId: string | null
  ingredientId: string | null
  /** Khoá gom phiếu. */
  groupKey: string
  /** Toàn bộ lỗi (định dạng + nghiệp vụ); rỗng = hợp lệ. */
  allErrors: string[]
}

export interface BulkOrderPayload {
  voucher_date?: string
  voucher_no?: string
  supplier_id: string
  note?: string
  has_invoice: boolean
  invoice_no?: string
  invoice_symbol?: string
  invoice_date?: string
  items: { ingredient_id: string; quantity: number; unit_price: number; factor?: number; vat_rate?: string; expiry_date?: string }[]
}

const digits = (s: string) => s.replace(/\D/g, '')

export function findSupplier(text: string, list: SupplierRef[]): SupplierRef | 'ambiguous' | null {
  const key = normalizeKey(text)
  if (!key) return null
  const byName = list.filter((s) => normalizeKey(s.name) === key)
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) return 'ambiguous'
  const d = digits(text)
  if (d.length >= 10) {
    const byTax = list.filter((s) => s.taxCode && digits(s.taxCode) === d)
    if (byTax.length === 1) return byTax[0]
    if (byTax.length > 1) return 'ambiguous'
  }
  return null
}

export function findIngredient(text: string, list: IngredientRef[]): IngredientRef | 'ambiguous' | null {
  const key = normalizeKey(text)
  if (!key) return null
  const hits = list.filter((i) => normalizeKey(i.name) === key)
  if (hits.length === 1) return hits[0]
  return hits.length > 1 ? 'ambiguous' : null
}

/** Số CT có ⇒ gom theo số CT; trống ⇒ mỗi NCC + ngày CT + số HĐ một phiếu. */
export function groupKeyOf(r: ParsedRow, supplierKey: string): string {
  return r.voucherNo ? `no:${r.voucherNo}` : `auto:${supplierKey}|${r.voucherDate}|${r.invoiceNo}`
}

/**
 * Đối chiếu danh mục và kiểm lỗi từng dòng.
 * `ingredientMap`: tên NL trong file (đã normalizeKey) → id do người dùng chọn tay.
 */
export function validateRows(rows: ParsedRow[], catalog: Catalog, ingredientMap: Record<string, string> = {}): PreviewRow[] {
  const out: PreviewRow[] = rows.map((r) => {
    const errs = [...r.errors]
    let supplierId: string | null = null
    const sup = findSupplier(r.partner, catalog.suppliers)
    if (!r.partner) errs.push('Thiếu nhà cung cấp')
    else if (sup === 'ambiguous') errs.push('NCC trùng tên trong danh mục, hãy dùng MST')
    else if (!sup) errs.push('NCC không tồn tại')
    else supplierId = sup.id

    let ingredientId: string | null = null
    const mapped = ingredientMap[normalizeKey(r.ingredient)]
    const ing = mapped ? ({ id: mapped } as IngredientRef) : findIngredient(r.ingredient, catalog.ingredients)
    if (!r.ingredient) errs.push('Thiếu nguyên liệu')
    else if (ing === 'ambiguous') errs.push('NL trùng tên trong danh mục, hãy chọn lại')
    else if (!ing) errs.push('NL không khớp danh mục')
    else ingredientId = ing.id

    if (r.quantity == null) errs.push('Thiếu số lượng')
    else if (!(r.quantity > 0)) errs.push('Số lượng phải > 0')
    if (r.unitPrice == null) errs.push('Thiếu đơn giá')
    else if (r.unitPrice < 0) errs.push('Đơn giá không được âm')
    if (r.factor != null && !(r.factor > 0)) errs.push('Hệ số phải > 0')
    if (!r.invoiceNo && (r.invoiceSymbol || r.invoiceDate)) errs.push('Có Ký hiệu/Ngày HĐ thì phải có Số HĐ')
    if (r.invoiceNo) {
      if (!r.invoiceDate) errs.push('Có Số HĐ thì phải có Ngày HĐ')
      if (!(VAT_RATES as readonly string[]).includes(r.vatRate)) errs.push(`Thuế suất phải thuộc: ${VAT_RATES.join(', ')}`)
    }
    return { ...r, supplierId, ingredientId, groupKey: groupKeyOf(r, supplierId ?? `?${normalizeKey(r.partner)}`), allErrors: errs }
  })

  // Kiểm tra nhất quán trong từng phiếu.
  const first = new Map<string, PreviewRow>()
  for (const r of out) {
    const head = first.get(r.groupKey)
    if (!head) {
      first.set(r.groupKey, r)
      continue
    }
    if (r.supplierId && head.supplierId && r.supplierId !== head.supplierId) r.allErrors.push(`NCC khác dòng ${head.rowNo} cùng Số CT`)
    if (r.invoiceNo !== head.invoiceNo) r.allErrors.push(`Số HĐ khác dòng ${head.rowNo} cùng Số CT`)
    if (r.invoiceSymbol !== head.invoiceSymbol) r.allErrors.push(`Ký hiệu HĐ khác dòng ${head.rowNo} cùng Số CT`)
    if (r.invoiceDate !== head.invoiceDate) r.allErrors.push(`Ngày HĐ khác dòng ${head.rowNo} cùng Số CT`)
    if (r.voucherDate !== head.voucherDate) r.allErrors.push(`Ngày CT khác dòng ${head.rowNo} cùng Số CT`)
  }
  return out
}

/** Gom các dòng hợp lệ thành payload cho POST /import-orders/bulk. */
export function buildOrders(rows: PreviewRow[]): BulkOrderPayload[] {
  const groups = new Map<string, PreviewRow[]>()
  for (const r of rows) groups.set(r.groupKey, [...(groups.get(r.groupKey) ?? []), r])
  return [...groups.values()].map((g) => {
    const h = g[0]
    const hasInvoice = !!h.invoiceNo
    const notes = [...new Set(g.map((r) => r.note).filter(Boolean))]
    return {
      voucher_date: h.voucherDate || undefined,
      voucher_no: h.voucherNo || undefined,
      supplier_id: h.supplierId!,
      note: notes.length ? notes.join('; ') : undefined,
      has_invoice: hasInvoice,
      invoice_no: hasInvoice ? h.invoiceNo : undefined,
      invoice_symbol: hasInvoice ? h.invoiceSymbol || undefined : undefined,
      invoice_date: hasInvoice ? h.invoiceDate : undefined,
      items: g.map((r) => ({
        ingredient_id: r.ingredientId!,
        quantity: r.quantity!,
        unit_price: r.unitPrice!,
        factor: r.factor ?? undefined,
        vat_rate: hasInvoice ? r.vatRate : undefined,
        expiry_date: r.expiry || undefined,
      })),
    }
  })
}
