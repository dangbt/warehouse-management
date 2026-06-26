import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

export interface IngredientUsageItem {
  id: string
  name: string
  unit: string
  total: number
}

interface UsageResponse {
  period: string
  from: string
  to: string
  data: IngredientUsageItem[]
}

export function useIngredientUsage(params?: { period?: string }) {
  const period = params?.period ?? 'week'
  return useQuery<IngredientUsageItem[]>({
    queryKey: QUERY_KEYS.ingredientUsageList({ period }),
    queryFn: async () => {
      const res: UsageResponse = await api.get(`/reports/ingredient-usage?period=${period}`)
      return res.data
    },
  })
}
