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

export function useIngredientUsage(params?: { period?: string; from?: string; to?: string }) {
  const period = params?.period ?? 'week'
  const query = new URLSearchParams({ period })
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  return useQuery<IngredientUsageItem[]>({
    queryKey: QUERY_KEYS.ingredientUsageList({ period, from: params?.from, to: params?.to }),
    queryFn: async () => {
      const res: UsageResponse = await api.get(`/reports/ingredient-usage?${query}`)
      return res.data
    },
  })
}
