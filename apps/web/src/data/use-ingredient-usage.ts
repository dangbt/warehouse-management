import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

export interface IngredientUsageItem {
  ingredientName: string
  unit: string
  totalUsed: number
}

export function useIngredientUsage(params?: { period?: string }) {
  const period = params?.period ?? 'week'
  return useQuery<IngredientUsageItem[]>({
    queryKey: QUERY_KEYS.ingredientUsageList({ period }),
    queryFn: () => api.get(`/reports/ingredient-usage?period=${period}`),
  })
}
