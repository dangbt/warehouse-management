import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

interface ImportOrder { id: string; code: string; supplier: { name: string }; totalAmount: string; status: string; createdAt: string; items: unknown[] }
interface ListResponse { data: ImportOrder[]; meta: { page: number; limit: number; total: number } }

export function useImportOrders(params?: { status?: string }) {
  const query = params?.status ? `?status=${params.status}&limit=50` : '?limit=50'
  return useQuery<ListResponse>({ queryKey: QUERY_KEYS.importOrdersList(params as Record<string, string>), queryFn: () => api.get(`/import-orders${query}`) })
}

export function useCreateImportOrder() {
  return useMutation({
    mutationFn: (data: { supplier_id: string; note?: string; items: { ingredient_id: string; quantity: number; unit_price: number; expiry_date?: string }[] }) => api.post('/import-orders', data),
    onSuccess: (newItem) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.importOrders }, (old) => old ? { ...old, data: [newItem, ...old.data] } : old)
      useToastStore.getState().success('Tạo phiếu nhập thành công')
    },
    onError: (e: Error) => { useToastStore.getState().error(e.message) },
  })
}

export function useApproveImportOrder() {
  return useMutation({
    mutationFn: (id: string) => api.put(`/import-orders/${id}/approve`, {}),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.importOrders }, (old) => old ? { ...old, data: old.data.map((o) => o.id === id ? { ...o, status: 'COMPLETED' } : o) } : old)
      useToastStore.getState().success('Đã duyệt phiếu nhập')
    },
    onError: (e: Error) => { useToastStore.getState().error(e.message) },
  })
}

export function useRejectImportOrder() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.put(`/import-orders/${id}/reject`, { reason }),
    onSuccess: (_, { id }) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.importOrders }, (old) => old ? { ...old, data: old.data.map((o) => o.id === id ? { ...o, status: 'REJECTED' } : o) } : old)
      useToastStore.getState().success('Đã từ chối phiếu nhập')
    },
    onError: (e: Error) => { useToastStore.getState().error(e.message) },
  })
}
