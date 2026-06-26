import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'

interface Recipe {
  id: string
  name: string
  menuItemId: string
  menuItem: { name: string }
  servingSize: number
  ingredients: { ingredientId: string; quantity: string; unit: string }[]
}
interface ListResponse {
  data: Recipe[]
  meta: { page: number; limit: number; total: number }
}

export function useRecipes() {
  return useQuery<ListResponse>({ queryKey: QUERY_KEYS.recipesList(), queryFn: () => api.get('/recipes?limit=50') })
}

export function useCreateRecipe() {
  return useMutation({
    mutationFn: (data: {
      menu_item_id: string
      name: string
      serving_size: number
      ingredients: { ingredient_id: string; quantity: number; unit: string }[]
    }) => api.post('/recipes', data),
    onSuccess: (newItem) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.recipes }, (old) =>
        old ? { ...old, data: [...old.data, newItem] } : old,
      )
    },
  })
}

export function useUpdateRecipe() {
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      name?: string
      serving_size?: number
      ingredients?: { ingredient_id: string; quantity: number; unit: string }[]
    }) => api.put(`/recipes/${id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.recipes }, (old) =>
        old ? { ...old, data: old.data.map((r) => (r.id === updated.id ? updated : r)) } : old,
      )
    },
  })
}
