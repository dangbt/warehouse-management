import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export interface KiotVietOrder {
  id: string
  code: string
  customerName: string
  totalAmount: number
  items: { productName: string; quantity: number }[]
  orderDate: string
  deducted: boolean
}

interface KiotVietOrdersResponse {
  data: KiotVietOrder[]
  meta: { page: number; limit: number; total: number }
}

export function useKiotVietOrders(params?: { page?: number; deducted?: string }) {
  return useQuery<KiotVietOrdersResponse>({
    queryKey: QUERY_KEYS.kiotvietOrdersList(params),
    queryFn: () => {
      const search = new URLSearchParams()
      if (params?.page) search.set('page', String(params.page))
      if (params?.deducted) search.set('deducted', params.deducted)
      const qs = search.toString()
      return api.get(`/kiotviet/orders${qs ? `?${qs}` : ''}`)
    },
  })
}

export function useSyncKiotViet() {
  return useMutation({
    mutationFn: (orders: unknown[]) => api.post('/kiotviet/sync', { orders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiotvietOrders })
      useToastStore.getState().success('Đồng bộ KiotViet thành công')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}

export function useDeductOrder() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/kiotviet/orders/${id}/deduct`),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<KiotVietOrdersResponse | undefined>(
        QUERY_KEYS.kiotvietOrders,
        undefined,
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiotvietOrders })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredients })
      useToastStore.getState().success('Trừ kho thành công')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}
