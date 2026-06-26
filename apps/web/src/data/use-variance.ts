import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

export interface VarianceItem {
  ingredientId: string
  ingredientName: string
  unit: string
  theoreticalUsage: number
  actualUsage: number
  variance: number
  variancePercent: number
}

export function useConsumptionVariance(params?: { from?: string; to?: string }) {
  const query = new URLSearchParams()
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  return useQuery<VarianceItem[]>({
    queryKey: QUERY_KEYS.reports.consumptionVariance({ from: params?.from, to: params?.to }),
    queryFn: () => api.get(`/reports/consumption-variance?${query}`),
  })
}
