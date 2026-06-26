import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export interface ProcessingOrder {
  id: string
  code: string
  sourceQty: string
  expectedQty: string
  outputQty: string
  status: string
  note: string | null
  completedAt: string | null
  createdAt: string
  source: { id: string; name: string; unit: string }
  output: { id: string; name: string; unit: string }
  createdBy?: { id: string; fullName: string }
}

interface ListResponse {
  data: ProcessingOrder[]
  meta: { page: number; limit: number; total: number }
}

export function useProcessingOrders(params?: { page?: number; status?: string }) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.status) query.set('status', params.status)
  return useQuery<ListResponse>({
    queryKey: QUERY_KEYS.processingList(Object.fromEntries(query)),
    queryFn: () => api.get(`/processing?${query}`),
  })
}

export function useCreateProcessing() {
  return useMutation({
    mutationFn: (data: {
      source_ingredient_id: string
      source_qty: number
      output_ingredient_id: string
      output_qty?: number
      note?: string
    }) => api.post('/processing', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.processing })
      useToastStore.getState().success('Tạo phiếu chế biến thành công')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}

export function useCompleteProcessing() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/processing/${id}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.processing })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredients })
      useToastStore.getState().success('Đã hoàn thành chế biến')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}
