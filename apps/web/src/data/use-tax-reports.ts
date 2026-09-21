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

// ---------------------------------------------------------------------------
// Tổng hợp thuế kỳ (TASK-154)
// ---------------------------------------------------------------------------

/** Số liệu một bên (đầu ra/đầu vào) trong tổng hợp VAT khấu trừ. */
export interface SummarySide {
  byRate: { vatRate: string; amountBeforeTax: number; vatAmount: number }[]
  totalBeforeTax: number
  totalVat: number
}

export interface VatDeductionSummaryResult {
  regime: 'VAT_DEDUCTION'
  period: { value: string; label: string }
  settings: { companyName: string | null; taxCode: string | null }
  output: SummarySide
  input: SummarySide
  carriedForwardIn: number
  payable: number
  carryToNext: number
  unsnapshottedOrders: number
  closed: boolean
  closedAt: string | null
}

export interface HouseholdSummaryResult {
  regime: 'HOUSEHOLD'
  period: { value: string; label: string }
  settings: { companyName: string | null; taxCode: string | null }
  revenue: number
  yearToDateRevenue: number
  vatPercent: number
  pitPercent: number
  exemptThreshold: number
  belowExemptThreshold: boolean
  vat: number
  pit: number
  closed: boolean
  closedAt: string | null
}

export type TaxSummaryResult = VatDeductionSummaryResult | HouseholdSummaryResult

/**
 * Tổng hợp thuế kỳ để lập tờ khai (`period` dạng `YYYY-MM`/`YYYY-Qn`).
 * `carriedForward` (tuỳ chọn) ghi đè thuế kỳ trước chuyển sang cho chế độ VAT khấu trừ.
 */
export function useTaxSummary(period: string | undefined, carriedForward?: number) {
  return useQuery<TaxSummaryResult>({
    queryKey: QUERY_KEYS.tax.summary(period, carriedForward),
    queryFn: () => {
      const params = new URLSearchParams({ period: period ?? '' })
      if (carriedForward !== undefined && !Number.isNaN(carriedForward)) params.set('carried_forward', String(carriedForward))
      return api.get(`/tax/summary?${params.toString()}`)
    },
    enabled: !!period,
  })
}

/** Chốt kỳ thuế: lưu snapshot cố định (quyền `tax:manage`). */
export function useCloseTaxPeriod() {
  return useMutation({
    mutationFn: (args: { period: string; carriedForward?: number }) => {
      const params = new URLSearchParams()
      if (args.carriedForward !== undefined && !Number.isNaN(args.carriedForward)) {
        params.set('carried_forward', String(args.carriedForward))
      }
      const qs = params.toString()
      return api.post(`/tax/periods/${encodeURIComponent(args.period)}/close${qs ? `?${qs}` : ''}`, {}) as Promise<TaxSummaryResult>
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tax', 'summary'] })
      useToastStore.getState().success(`Đã chốt kỳ ${res.period.label}`)
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}

/** Mở lại kỳ đã chốt để tính lại động (quyền `tax:manage`). */
export function useReopenTaxPeriod() {
  return useMutation({
    mutationFn: (period: string) =>
      api.delete(`/tax/periods/${encodeURIComponent(period)}/close`) as Promise<{ period: string; reopened: boolean }>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax', 'summary'] })
      useToastStore.getState().success('Đã mở lại kỳ để tính lại')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}
