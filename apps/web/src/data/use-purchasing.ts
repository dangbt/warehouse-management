import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export interface PurchaseRequestItem {
  id: string
  ingredientId: string
  ingredient: { name: string; unit: string }
  quantity: string
  buyUnit?: string | null
  supplierId?: string | null
  supplier?: { name: string } | null
  unitPrice: string
}

export interface PurchaseRequest {
  id: string
  code: string
  status: string
  note?: string | null
  createdAt: string
  items: PurchaseRequestItem[]
  orders?: { id: string; code: string }[]
}

export interface PurchaseOrderItem {
  id: string
  ingredientId: string
  ingredient: { name: string; unit: string }
  quantity: string
  receivedQty: string
  unitPrice: string
}

export interface PurchaseOrder {
  id: string
  code: string
  status: string
  supplierId: string
  supplier: { name: string; phone?: string | null; address?: string | null }
  totalAmount: string
  note?: string | null
  createdAt: string
  items: PurchaseOrderItem[]
}

export interface LowStockSuggestion {
  ingredientId: string
  name: string
  unit: string
  minStock: number
  currentStock: number
  buyUnit: string | null
  buyFactor: number
  quantity: number
  supplierId: string | null
  unitPrice: number
}

export interface ReceiptDraft {
  purchaseOrderId: string
  code: string
  supplierId: string
  items: { ingredientId: string; name: string; unit: string; quantity: number; unitPrice: number }[]
}

interface List<T> {
  data: T[]
  meta: { page: number; limit: number; total: number }
}

const toastError = (e: Error) => useToastStore.getState().error(e.message)

export function usePurchaseRequests() {
  return useQuery<List<PurchaseRequest>>({
    queryKey: QUERY_KEYS.purchaseRequestsList(),
    queryFn: () => api.get('/purchase-requests?limit=50'),
  })
}

export function fetchLowStockSuggestion(safetyFactor: number): Promise<{ safetyFactor: number; items: LowStockSuggestion[] }> {
  return api.get(`/purchase-requests/suggest-low-stock?safety_factor=${safetyFactor}`)
}

export function useCreatePurchaseRequest() {
  return useMutation({
    mutationFn: (data: {
      note?: string
      items: { ingredient_id: string; quantity: number; buy_unit?: string; buy_factor?: number; supplier_id?: string; unit_price?: number }[]
    }) => api.post('/purchase-requests', data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseRequests })
      useToastStore.getState().success('Đã lập đề nghị mua hàng')
    },
    onError: toastError,
  })
}

export function usePurchaseRequestAction(action: 'approve' | 'reject') {
  return useMutation({
    mutationFn: (id: string) => api.put(`/purchase-requests/${id}/${action}`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseRequests })
      useToastStore.getState().success(action === 'approve' ? 'Đã duyệt đề nghị' : 'Đã từ chối đề nghị')
    },
    onError: toastError,
  })
}

export function usePurchaseOrders() {
  return useQuery<List<PurchaseOrder>>({
    queryKey: QUERY_KEYS.purchaseOrdersList(),
    queryFn: () => api.get('/purchase-orders?limit=50'),
  })
}

export function useCreatePurchaseOrdersFromRequest() {
  return useMutation({
    mutationFn: (requestId: string) => api.post('/purchase-orders/from-request', { request_id: requestId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseRequests })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseOrders })
      useToastStore.getState().success('Đã tách đơn mua hàng theo NCC')
    },
    onError: toastError,
  })
}

export function useCancelPurchaseOrder() {
  return useMutation({
    mutationFn: (id: string) => api.put(`/purchase-orders/${id}/cancel`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseOrders })
      useToastStore.getState().success('Đã huỷ đơn mua hàng')
    },
    onError: toastError,
  })
}

export function fetchReceiptDraft(id: string): Promise<ReceiptDraft> {
  return api.get(`/purchase-orders/${id}/receipt-draft`)
}
