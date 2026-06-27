import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

interface Ingredient {
  id: string
  name: string
  unit: string
  minStock: string
  currentStock: string
  costPerUnit: string
  category: string
  createdAt: string
}

interface ListResponse {
  data: Ingredient[]
  meta: { page: number; limit: number; total: number }
}

export function useIngredients(params?: { page?: number; category?: string; search?: string; limit?: number }) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.category) query.set('category', params.category)
  if (params?.search) query.set('search', params.search)
  if (params?.limit) query.set('limit', String(params.limit))
  const key = QUERY_KEYS.ingredientsList(Object.fromEntries(query))

  return useQuery<ListResponse>({ queryKey: key, queryFn: () => api.get(`/ingredients?${query}`) })
}

// Trường bán thành phẩm + gom nhóm (tuỳ chọn)
type BtpFields = {
  group_id?: string | null
  base_factor?: number | null
  source_ingredient_id?: string | null
  yield_ratio?: number | null
  loss_ratio?: number | null
}

export function useCreateIngredient() {
  return useMutation({
    mutationFn: (data: { name: string; unit: string; category: string; cost_per_unit: number; min_stock: number } & BtpFields) =>
      api.post('/ingredients', data),
    onSuccess: (newItem) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.ingredients }, (old) => {
        if (!old) return old
        return { ...old, data: [...old.data, newItem], meta: { ...old.meta, total: old.meta.total + 1 } }
      })
      useToastStore.getState().success('Thêm nguyên liệu thành công')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}

export function useUpdateIngredient() {
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      name?: string
      unit?: string
      category?: string
      cost_per_unit?: number
      min_stock?: number
    } & BtpFields) => api.put(`/ingredients/${id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.ingredients }, (old) => {
        if (!old) return old
        return { ...old, data: old.data.map((i) => (i.id === updated.id ? updated : i)) }
      })
      useToastStore.getState().success('Cập nhật thành công')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}

export function useDeleteIngredient() {
  return useMutation({
    mutationFn: (id: string) => api.delete(`/ingredients/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.ingredients }, (old) => {
        if (!old) return old
        return { ...old, data: old.data.filter((i) => i.id !== id), meta: { ...old.meta, total: old.meta.total - 1 } }
      })
      useToastStore.getState().success('Đã xoá nguyên liệu')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}
