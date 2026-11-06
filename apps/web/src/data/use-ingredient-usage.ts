import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'
import { vnDayBoundsUtc } from './vn-day-range'

export interface IngredientUsageItem {
  id: string
  name: string
  unit: string
  imported: number
  exported: number
  currentStock: number
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
  if (params?.from && params?.to) {
    const b = vnDayBoundsUtc(params.from, params.to)
    query.set('from', b.from)
    query.set('to', b.to)
  }
  return useQuery<IngredientUsageItem[]>({
    queryKey: QUERY_KEYS.ingredientUsageList({ period, from: params?.from, to: params?.to }),
    queryFn: async () => {
      const res: UsageResponse = await api.get(`/reports/ingredient-usage?${query}`)
      return res.data
    },
  })
}
