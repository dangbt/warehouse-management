import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'
import { describeUnpostError } from '@/utils/api-error-messages'

interface ImportOrder {
  id: string
  code: string
  supplier: { name: string }
  totalAmount: string
  status: string
  createdAt: string
  voucherDate: string
  voucherNo: string
  hasInvoice?: boolean
  invoiceNo?: string | null
  invoiceSymbol?: string | null
  invoiceDate?: string | null
  subtotal?: string
  vatAmount?: string
  items: unknown[]
}
interface ListResponse {
  data: ImportOrder[]
  meta: { page: number; limit: number; total: number; totals?: { subtotal: number; vatAmount: number; totalAmount: number } }
}

export function useImportOrders(params?: { id?: string; status?: string; page?: number; orderBy?: string; sort?: string; from?: string; to?: string }) {
  const query = new URLSearchParams({ limit: '50' })
  if (params?.id) query.set('id', params.id)
  if (params?.status) query.set('status', params.status)
  if (params?.page) query.set('page', String(params.page))
  if (params?.orderBy) query.set('orderBy', params.orderBy)
  if (params?.sort) query.set('sort', params.sort)
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  return useQuery<ListResponse>({
    queryKey: QUERY_KEYS.importOrdersList(Object.fromEntries(query)),
    queryFn: () => api.get(`/import-orders?${query}`),
  })
}

export interface ImportOrderDetail extends Omit<ImportOrder, 'items'> {
  note?: string | null
  items: {
    id: string
    ingredient: { name: string; unit: string }
    quantity: string
    unitPrice: string
    totalPrice: string
  }[]
}

/** Chi tiết 1 phiếu nhập (dùng cho trang in). Key riêng để không lẫn với cache danh sách. */
export interface PrintHeader {
  companyName: string | null
  address: string | null
  taxCode: string | null
}

/** Header đơn vị để in (quyền import_orders:read, không cần tax:read). */
export function usePrintHeader() {
  return useQuery<PrintHeader>({
    queryKey: ['import-orders', 'print-header'],
    queryFn: () => api.get('/import-orders/print-header'),
  })
}

export function useImportOrderDetail(id: string) {
  return useQuery<ImportOrderDetail>({
    queryKey: ['import-order-detail', id],
    queryFn: () => api.get(`/import-orders/${id}`),
  })
}

export function useCreateImportOrder() {
  return useMutation({
    mutationFn: (data: {
      voucher_date?: string
      voucher_no?: string
      supplier_id: string
      note?: string
      paid?: boolean
      has_invoice?: boolean
      invoice_no?: string
      invoice_symbol?: string
      invoice_date?: string
      purchase_address?: string
      purchase_order_id?: string
      items: {
        ingredient_id: string
        quantity: number
        unit_price: number
        expiry_date?: string
        unit?: string
        factor?: number
        vat_rate?: string
      }[]
    }) => api.post('/import-orders', data),
    onSuccess: (newItem) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.importOrders }, (old) =>
        old ? { ...old, data: [newItem, ...old.data] } : old,
      )
      useToastStore.getState().success('Tạo phiếu nhập thành công')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}

export function useApproveImportOrder() {
  return useMutation({
    mutationFn: (id: string) => api.put(`/import-orders/${id}/approve`, {}),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.importOrders }, (old) =>
        old ? { ...old, data: old.data.map((o) => (o.id === id ? { ...o, status: 'COMPLETED' } : o)) } : old,
      )
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseOrders })
      useToastStore.getState().success('Đã duyệt phiếu nhập')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}

export function useRejectImportOrder() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.put(`/import-orders/${id}/reject`, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.importOrders }, (old) =>
        old ? { ...old, data: old.data.map((o) => (o.id === id ? { ...o, status: 'REJECTED' } : o)) } : old,
      )
      useToastStore.getState().success('Đã từ chối phiếu nhập')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}

function useOrderMutation(path: (id: string) => string, successMsg: string) {
  return useMutation({
    mutationFn: (id: string) => api.put(path(id), {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.importOrders })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredients })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseOrders })
      useToastStore.getState().success(successMsg)
    },
    onError: (e: Error) => {
      useToastStore.getState().error(describeUnpostError(e))
    },
  })
}

/** Bỏ ghi phiếu nhập đã duyệt (đảo tồn/lô/công nợ/VAT) → về Chờ duyệt. */
export const useUnpostImportOrder = () => useOrderMutation((id) => `/import-orders/${id}/unpost`, 'Đã bỏ ghi phiếu nhập')

/** Huỷ mềm phiếu Chờ duyệt / Từ chối. */
export const useCancelImportOrder = () => useOrderMutation((id) => `/import-orders/${id}/cancel`, 'Đã huỷ phiếu nhập')

/** Sửa toàn bộ phiếu Chờ duyệt (header + dòng). */
export function useUpdateImportOrder() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.put(`/import-orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.importOrders })
      useToastStore.getState().success('Đã cập nhật phiếu nhập')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}

export interface BulkImportReport {
  created: number
  itemCount: number
  totalAmount: number
  orders: { id: string; code: string; voucherNo: string; supplierId: string; itemCount: number; totalAmount: number }[]
}

/** Tạo nhiều phiếu nhập (PENDING) một lần, all-or-nothing. */
export function useBulkCreateImportOrders() {
  return useMutation({
    mutationFn: (orders: unknown[]): Promise<BulkImportReport> => api.post('/import-orders/bulk', { orders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.importOrders })
    },
  })
}
