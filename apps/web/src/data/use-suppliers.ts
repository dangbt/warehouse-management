import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

interface Supplier { id: string; name: string; phone: string; address: string; note?: string }
interface ListResponse { data: Supplier[]; meta: { page: number; limit: number; total: number } }

export function useSuppliers() {
  return useQuery<ListResponse>({ queryKey: QUERY_KEYS.suppliersList(), queryFn: () => api.get('/suppliers?limit=100') })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; phone?: string; address?: string; note?: string }) => api.post('/suppliers', data),
    onSuccess: (newItem) => {
      qc.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.suppliers }, (old) => old ? { ...old, data: [...old.data, newItem], meta: { ...old.meta, total: old.meta.total + 1 } } : old)
    },
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; phone?: string; address?: string; note?: string }) => api.put(`/suppliers/${id}`, data),
    onSuccess: (updated) => {
      qc.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.suppliers }, (old) => old ? { ...old, data: old.data.map((i) => i.id === updated.id ? updated : i) } : old)
    },
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: (_, id) => {
      qc.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.suppliers }, (old) => old ? { ...old, data: old.data.filter((i) => i.id !== id), meta: { ...old.meta, total: old.meta.total - 1 } } : old)
    },
  })
}
