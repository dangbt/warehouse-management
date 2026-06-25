import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'

interface StockExport { id: string; ingredient: { name: string; unit: string }; quantity: string; note: string; createdBy: { fullName: string }; createdAt: string }
interface ListResponse { data: StockExport[]; meta: { page: number; limit: number; total: number } }

export function useStockExports() {
  return useQuery<ListResponse>({ queryKey: QUERY_KEYS.stockExportsList(), queryFn: () => api.get('/stock-exports?limit=50') })
}

export function useCreateStockExport() {
  return useMutation({
    mutationFn: (data: { ingredient_id: string; quantity: number; reason: string; note?: string }) => api.post('/stock-exports', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stockExports })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredients })
    },
  })
}
