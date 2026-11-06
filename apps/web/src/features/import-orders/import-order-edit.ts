/** Chuyển phiếu nhập (dữ liệu API) sang giá trị khởi tạo của form ở chế độ sửa. */
export interface EditableImportOrder {
  id: string
  voucherDate: string
  voucherNo: string
  supplierId?: string
  note?: string | null
  paid?: boolean
  hasInvoice?: boolean
  invoiceNo?: string | null
  invoiceSymbol?: string | null
  invoiceDate?: string | null
  purchaseAddress?: string | null
  items?: { ingredientId?: string; ingredient?: { id?: string; name?: string; unit?: string }; quantity: string; unitPrice: string; vatRate?: string | null; expiryDate?: string | null }[]
}

const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '')

/** Ngày CT lưu ISO UTC; hiển thị theo ngày lịch địa phương (giờ VN) như ô Ngày CT của form. */
export function localDay(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function orderToFormValues(o: EditableImportOrder) {
  return {
    supplier_id: o.supplierId ?? '',
    note: o.note ?? '',
    paid: !!o.paid,
    has_invoice: !!o.hasInvoice,
    invoice_symbol: o.invoiceSymbol ?? '',
    invoice_no: o.invoiceNo ?? '',
    invoice_date: day(o.invoiceDate),
    purchase_address: o.purchaseAddress ?? '',
    items: (o.items ?? []).map((i) => ({
      ingredient_id: i.ingredientId ?? i.ingredient?.id ?? '',
      quantity: Number(i.quantity),
      factor: 1,
      unit_price: Number(i.unitPrice),
      vat_rate: i.vatRate ?? '8',
      expiry_date: day(i.expiryDate),
    })),
  }
}

/** Nguyên liệu của các dòng phiếu — luôn có mặt trong danh sách chọn dù không nằm trong kết quả tìm kiếm. */
export function orderIngredientOptions(o?: EditableImportOrder | null) {
  const seen = new Map<string, { value: string; label: string; unit: string }>()
  for (const i of o?.items ?? []) {
    const id = i.ingredientId ?? i.ingredient?.id
    if (id && !seen.has(id)) seen.set(id, { value: id, label: i.ingredient?.name ?? id, unit: i.ingredient?.unit ?? '' })
  }
  return [...seen.values()]
}
