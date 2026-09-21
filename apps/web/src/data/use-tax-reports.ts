import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

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

export interface OutputRevenueGroup {
  vatRate: string
  orderCount: number
  amountBeforeTax: number
  vatAmount: number
  gross: number
}

export interface OutputRevenueReport {
  period: { value: string; label: string; from: string; to: string }
  settings: { companyName: string | null; taxCode: string | null }
  groups: OutputRevenueGroup[]
  total: { orderCount: number; amountBeforeTax: number; vatAmount: number; gross: number }
}

/**
 * Doanh thu bán hàng KiotViet theo thuế suất VAT đầu ra trong kỳ.
 * `enabled` = có period hợp lệ.
 */
export function useOutputRevenue(period: string | undefined) {
  return useQuery<OutputRevenueReport>({
    queryKey: QUERY_KEYS.tax.outputRevenue(period),
    queryFn: () => api.get(`/tax/output-revenue?period=${encodeURIComponent(period ?? '')}`),
    enabled: !!period,
  })
}

/**
 * Tính lại snapshot thuế đầu ra cho các đơn KiotViet trong kỳ (quyền `tax:manage`).
 * Dùng khi đổi thuế suất món hoặc cấu hình thuế.
 */
export function useRecomputeOutputVat() {
  return useMutation({
    mutationFn: (period: string) =>
      api.post(`/tax/recompute-output-vat?period=${encodeURIComponent(period)}`, {}) as Promise<{ period: string; updated: number }>,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tax', 'output-revenue'] })
      useToastStore.getState().success(`Đã tính lại thuế cho ${res.updated} đơn (${res.period})`)
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}
