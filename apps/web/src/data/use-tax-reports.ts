import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

export interface InputInvoiceRow {
  stt: number
  invoiceSymbol: string | null
  invoiceNo: string | null
  invoiceDate: string | null
  supplierName: string
  supplierTaxCode: string | null
  subtotal: number
  vatAmount: number
  importOrderCode: string
  note?: string
}

export interface InputInvoiceGroup {
  vatRate: string
  rows: InputInvoiceRow[]
  subtotal: number
  vatAmount: number
}

export interface InputInvoiceReport {
  period: { value: string; label: string; from: string; to: string }
  settings: { companyName: string | null; taxCode: string | null }
  groups: InputInvoiceGroup[]
  total: { subtotal: number; vatAmount: number }
}

/**
 * Bảng kê hoá đơn mua vào theo kỳ (`period` dạng `YYYY-MM` hoặc `YYYY-Qn`).
 * `enabled` = có period hợp lệ.
 */
export function useInputInvoices(period: string | undefined) {
  return useQuery<InputInvoiceReport>({
    queryKey: QUERY_KEYS.tax.inputInvoices(period),
    queryFn: () => api.get(`/tax/input-invoices?period=${encodeURIComponent(period ?? '')}`),
    enabled: !!period,
  })
}

export interface NoInvoicePurchaseRow {
  stt: number
  date: string
  sellerName: string
  sellerAddress: string | null
  sellerIdNumber: string | null
  missingIdNumber: boolean
  ingredientName: string
  unit: string
  quantity: number
  unitPrice: number
  totalPrice: number
  importOrderCode: string
}

export interface NoInvoicePurchaseReport {
  period: { value: string; label: string; from: string; to: string }
  settings: { companyName: string | null; taxCode: string | null; address: string | null }
  rows: NoInvoicePurchaseRow[]
  total: { totalPrice: number }
}

/**
 * Bảng kê thu mua hàng hoá không có hoá đơn (mẫu 01/TNDN) theo kỳ.
 * `enabled` = có period hợp lệ.
 */
export function useNoInvoicePurchases(period: string | undefined) {
  return useQuery<NoInvoicePurchaseReport>({
    queryKey: QUERY_KEYS.tax.noInvoicePurchases(period),
    queryFn: () => api.get(`/tax/no-invoice-purchases?period=${encodeURIComponent(period ?? '')}`),
    enabled: !!period,
  })
}
