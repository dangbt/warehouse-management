import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

interface Supplier { id: string; name: string; phone: string; address: string; note?: string }
interface ListResponse { data: Supplier[]; meta: { page: number; limit: number; total: number } }

export function useSuppliers() {
  return useQuery<ListResponse>({ queryKey: QUERY_KEYS.suppliersList(), queryFn: () => api.get('/suppliers?limit=100') })
}

export function useCreateSupplier() {
  return useMutation({
    mutationFn: (data: { name: string; phone?: string; address?: string; note?: string }) => api.post('/suppliers', data),
    onSuccess: (newItem) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.suppliers }, (old) => old ? { ...old, data: [...old.data, newItem], meta: { ...old.meta, total: old.meta.total + 1 } } : old)
      useToastStore.getState().success('Thêm NCC thành công')
    },
    onError: (e: Error) => { useToastStore.getState().error(e.message) },
  })
}

export function useUpdateSupplier() {
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; phone?: string; address?: string; note?: string }) => api.put(`/suppliers/${id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.suppliers }, (old) => old ? { ...old, data: old.data.map((i) => i.id === updated.id ? updated : i) } : old)
      useToastStore.getState().success('Cập nhật thành công')
    },
    onError: (e: Error) => { useToastStore.getState().error(e.message) },
  })
}

export function useDeleteSupplier() {
  return useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.suppliers }, (old) => old ? { ...old, data: old.data.filter((i) => i.id !== id), meta: { ...old.meta, total: old.meta.total - 1 } } : old)
      useToastStore.getState().success('Đã xoá NCC')
    },
    onError: (e: Error) => { useToastStore.getState().error(e.message) },
  })
}
