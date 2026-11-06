import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

interface StockExport {
  id: string
  ingredient: { name: string; unit: string }
  quantity: string
  note: string
  createdBy: { fullName: string }
  createdAt: string
  voucherDate: string
  export?: { voucherNo: string; voucherDate: string } | null
}
interface ListResponse {
  data: StockExport[]
  meta: { page: number; limit: number; total: number }
}

export function useStockExports(params?: { id?: string; page?: number; orderBy?: string; sort?: string }) {
  const query = new URLSearchParams({ limit: '20' })
  if (params?.id) query.set('id', params.id)
  if (params?.page) query.set('page', String(params.page))
  if (params?.orderBy) query.set('orderBy', params.orderBy)
  if (params?.sort) query.set('sort', params.sort)
  return useQuery<ListResponse>({
    queryKey: [...QUERY_KEYS.stockExportsList(), Object.fromEntries(query)],
    queryFn: () => api.get(`/stock-exports?${query}`),
  })
}

export function useCreateStockExport() {
  return useMutation({
    mutationFn: (data: {
      ingredient_id: string
      quantity: number
      reason: string
      note?: string
      voucher_date?: string
      voucher_no?: string
    }) =>
      api.post('/stock-exports', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stockExports })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredients })
      useToastStore.getState().success('Xuất kho thành công')
    },
  })
}
