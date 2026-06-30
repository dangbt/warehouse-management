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

export function useKiotVietOrders(params?: { page?: number; deducted?: string; orderBy?: string; sort?: string }) {
  return useQuery<KiotVietOrdersResponse>({
    queryKey: QUERY_KEYS.kiotvietOrdersList(params),
    queryFn: () => {
      const search = new URLSearchParams()
      if (params?.page) search.set('page', String(params.page))
      if (params?.deducted) search.set('deducted', params.deducted)
      if (params?.orderBy) search.set('orderBy', params.orderBy)
      if (params?.sort) search.set('sort', params.sort)
      const qs = search.toString()
      return api.get(`/kiotviet/orders${qs ? `?${qs}` : ''}`)
    },
  })
}

type SyncResult = { synced: number; skipped: number; deducted: number; unconfigured?: string[]; errors: string[] }

function onSyncSuccess(res: SyncResult) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiotvietOrders })
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredients }) // tồn đã tự trừ
  const t = useToastStore.getState()
  t.success(`Đồng bộ ${res.synced} đơn · tự trừ kho ${res.deducted}${res.skipped ? ` · bỏ qua ${res.skipped}` : ''}`)
  if (res.unconfigured?.length) t.error(`${res.unconfigured.length} món chưa cấu hình trừ tồn: ${res.unconfigured.slice(0, 3).join(', ')} — vào Thực đơn để cấu hình`)
  if (res.errors?.length) t.error(`${res.errors.length} đơn lỗi: ${res.errors[0]}`)
}

export function useSyncKiotViet() {
  return useMutation({
    mutationFn: (orders: unknown[]) => api.post('/kiotviet/sync', { orders }) as Promise<SyncResult>,
    onSuccess: onSyncSuccess,
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}

export function useSyncKiotVietApi() {
  return useMutation({
    mutationFn: (config: { clientId: string; clientSecret: string; retailer: string; fromDate?: string; toDate?: string }) =>
      api.post('/kiotviet/sync-api', config) as Promise<SyncResult>,
    onSuccess: onSyncSuccess,
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
