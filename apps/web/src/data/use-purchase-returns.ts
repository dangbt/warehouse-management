import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export interface PurchaseReturn {
  id: string
  code: string
  supplier: { id: string; name: string }
  totalAmount: string
  reason: string
  createdAt: string
  items: PurchaseReturnItem[]
}

export interface PurchaseReturnItem {
  id: string
  ingredient: { id: string; name: string; unit: string }
  quantity: number
  unitPrice: number
}

interface ListResponse {
  data: PurchaseReturn[]
  meta: { page: number; limit: number; total: number }
}

export function usePurchaseReturns() {
  return useQuery<ListResponse>({
    queryKey: QUERY_KEYS.purchaseReturnsList(),
    queryFn: () => api.get('/purchase-returns?limit=50'),
  })
}

export function useCreatePurchaseReturn() {
  return useMutation({
    mutationFn: (data: {
      supplierId: string
      reason: string
      items: { ingredientId: string; quantity: number; unitPrice: number }[]
    }) => api.post('/purchase-returns', data),
    onSuccess: (newItem) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.purchaseReturns }, (old) =>
        old ? { ...old, data: [newItem, ...old.data] } : old,
      )
      useToastStore.getState().success('Tạo phiếu trả hàng thành công')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}
