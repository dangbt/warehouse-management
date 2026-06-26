import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export interface StocktakeSession {
  id: string
  code: string
  status: string
  _count?: { items: number }
  createdAt: string
  completedAt: string | null
}

export interface StocktakeItem {
  id: string
  ingredient: { id: string; name: string; unit: string }
  systemQty: string
  actualQty: string | null
  difference: string | null
  note: string | null
}

export interface StocktakeDetail {
  id: string
  code: string
  status: string
  items: StocktakeItem[]
  createdAt: string
  completedAt: string | null
}

interface SessionListResponse {
  data: StocktakeSession[]
  meta: { page: number; limit: number; total: number }
}

export function useStocktakeSessions() {
  return useQuery<SessionListResponse>({
    queryKey: QUERY_KEYS.stocktakeList(),
    queryFn: () => api.get('/stocktake?limit=50'),
  })
}

export function useStocktakeDetail(id: string) {
  return useQuery<StocktakeDetail>({
    queryKey: QUERY_KEYS.stocktakeDetail(id),
    queryFn: () => api.get(`/stocktake/${id}`),
    enabled: !!id,
  })
}

export function useCreateStocktake() {
  return useMutation({
    mutationFn: () => api.post('/stocktake', {}),
    onSuccess: (newItem) => {
      queryClient.setQueriesData<SessionListResponse>({ queryKey: QUERY_KEYS.stocktake }, (old) =>
        old ? { ...old, data: [newItem, ...old.data] } : old,
      )
      useToastStore.getState().success('Tạo phiên kiểm kê thành công')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}

export function useUpdateStocktakeItems() {
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: { id: string; actualQty: number; note?: string }[] }) =>
      api.put(`/stocktake/${id}/items`, { items }),
    onSuccess: (updated: StocktakeDetail) => {
      queryClient.setQueryData(QUERY_KEYS.stocktakeDetail(updated.id), updated)
      useToastStore.getState().success('Đã lưu kết quả kiểm kê')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}

export function useCompleteStocktake() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/stocktake/${id}/complete`, {}),
    onSuccess: (updated: StocktakeDetail) => {
      queryClient.setQueryData(QUERY_KEYS.stocktakeDetail(updated.id), updated)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stocktake })
      useToastStore.getState().success('Đã hoàn thành phiên kiểm kê')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}
