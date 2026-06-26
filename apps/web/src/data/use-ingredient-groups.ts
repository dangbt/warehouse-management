import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export interface IngredientGroup {
  id: string
  name: string
  baseUnit: string
  minStock: string | null
  note: string | null
  _count?: { ingredients: number }
}

export function useIngredientGroups() {
  return useQuery<IngredientGroup[]>({
    queryKey: QUERY_KEYS.ingredientGroupsList(),
    queryFn: () => api.get('/ingredient-groups'),
  })
}

export function useCreateIngredientGroup() {
  return useMutation({
    mutationFn: (data: { name: string; base_unit: string; min_stock?: number | null; note?: string }) =>
      api.post('/ingredient-groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredientGroups })
      useToastStore.getState().success('Tạo nhóm thành công')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}

export function useUpdateIngredientGroup() {
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; base_unit?: string; min_stock?: number | null; note?: string }) =>
      api.put(`/ingredient-groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredientGroups })
      useToastStore.getState().success('Cập nhật nhóm thành công')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}
