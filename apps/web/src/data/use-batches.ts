import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

export interface Batch {
  id: string
  batchCode: string
  ingredientId: string
  costPerUnit: string
  quantity: string
  expiryDate: string | null
  status: string
  createdAt: string
}

interface BatchListResponse {
  data: Batch[]
  meta: { page: number; limit: number; total: number }
}

export function useIngredientBatches(ingredientId: string | undefined) {
  return useQuery<Batch[]>({
    queryKey: QUERY_KEYS.batchesList(ingredientId ?? ''),
    queryFn: async () => {
      const res: BatchListResponse = await api.get(`/batches?ingredientId=${ingredientId}&limit=100`)
      return res.data
    },
    enabled: !!ingredientId,
  })
}

export interface ExpiringBatch {
  id: string
  batchCode: string
  ingredient: { id: string; name: string; unit: string }
  quantity: string
  expiryDate: string
  daysUntilExpiry: number
}

export function useExpiringBatches(days: number) {
  return useQuery<ExpiringBatch[]>({
    queryKey: QUERY_KEYS.reports.expiring(days),
    queryFn: () => api.get(`/reports/expiring?days=${days}`),
  })
}
