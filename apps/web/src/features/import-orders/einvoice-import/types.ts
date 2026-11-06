export interface EinvoiceLine {
  stt: number
  name: string
  unit: string
  quantity: number
  unitPrice: number
  amount: number
  vatRate: string
  vatAmount: number
  discountAllocated: number
  mapping: { ingredientId: string; factor: number } | null
}

export interface EinvoiceWarning {
  code: string
  message: string
}

export interface EinvoiceInvoice {
  template: string
  symbol: string
  invoiceNo: string
  invoiceDate: string
  seller: { taxCode: string; name: string; address: string }
  lines: EinvoiceLine[]
  declared: { subtotal: number; vatAmount: number; total: number }
  computed: { subtotal: number; vatAmount: number; total: number }
  warnings: EinvoiceWarning[]
}

export interface EinvoiceResult {
  fileName: string
  ok: boolean
  error?: { code: string; message: string }
  invoice?: EinvoiceInvoice
  supplier?: { id: string; name: string } | null
  duplicateOf?: string | null
}

export interface MappingPayload {
  supplier_id: string
  item_name: string
  unit: string
  ingredient_id: string
  factor: number
}
