import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'
import { vnDayBoundsUtc } from './vn-day-range'

export interface VarianceItem {
  ingredientId: string
  name: string
  unit: string
  theoreticalUsage: number
  actualUsage: number
  variance: number
  variancePercent: number
}

export function useConsumptionVariance(params?: { from?: string; to?: string }) {
  const query = new URLSearchParams()
  if (params?.from && params?.to) {
    const b = vnDayBoundsUtc(params.from, params.to)
    query.set('from', b.from)
    query.set('to', b.to)
  }
  return useQuery<VarianceItem[]>({
    queryKey: QUERY_KEYS.reports.consumptionVariance({ from: params?.from, to: params?.to }),
    queryFn: async () => {
      const res: { data: VarianceItem[] } = await api.get(`/reports/consumption-variance?${query}`)
      return res.data
    },
  })
}
