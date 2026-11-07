import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export type StockTransferStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

export interface StockTransfer {
  id: string
  voucherNo: string
  voucherDate: string
  status: StockTransferStatus
  note: string | null
  fromWarehouse: { id: string; code: string; name: string }
  toWarehouse: { id: string; code: string; name: string }
  items: { id: string; ingredientId: string; quantity: string; ingredient: { id: string; name: string; unit: string; sku?: string | null } }[]
  /** Giá vốn thực xuất theo lô (chỉ phiếu đã duyệt). */
  transactions: { ingredientId: string; quantity: string; totalCost: string | null }[]
}

interface ListResponse {
  data: StockTransfer[]
  meta: { page: number; limit: number; total: number }
}

export interface StockTransferInput {
  from_warehouse_id: string
  to_warehouse_id: string
  voucher_date?: string
  voucher_no?: string
  note?: string
  items: { ingredient_id: string; quantity: number }[]
}

export function useStockTransfers(params?: { id?: string; page?: number; from?: string; to?: string; warehouseId?: string }) {
  const query = new URLSearchParams({ limit: '20' })
  if (params?.id) query.set('id', params.id)
  if (params?.page) query.set('page', String(params.page))
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  if (params?.warehouseId) query.set('warehouse_id', params.warehouseId)
  return useQuery<ListResponse>({
    queryKey: [...QUERY_KEYS.stockTransfers, 'list', Object.fromEntries(query)],
    queryFn: () => api.get(`/stock-transfers?${query}`),
  })
}

export function useStockTransfer(id: string) {
  return useQuery<StockTransfer>({
    queryKey: [...QUERY_KEYS.stockTransfers, 'one', id],
    queryFn: () => api.get(`/stock-transfers/${id}`),
    enabled: !!id,
  })
}

function invalidateStock() {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stockTransfers })
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ingredients })
}

export function useCreateStockTransfer() {
  return useMutation({
    mutationFn: (data: StockTransferInput) => api.post('/stock-transfers', data),
    onSuccess: () => {
      invalidateStock()
      useToastStore.getState().success('Đã tạo phiếu chuyển kho')
    },
  })
}

const ACTION_MESSAGE = { approve: 'Đã duyệt phiếu chuyển kho', unpost: 'Đã bỏ ghi phiếu chuyển kho', cancel: 'Đã huỷ phiếu chuyển kho' } as const

/** Duyệt / bỏ ghi / huỷ phiếu chuyển kho. */
export function useStockTransferAction(action: keyof typeof ACTION_MESSAGE) {
  return useMutation({
    mutationFn: (id: string) => api.put(`/stock-transfers/${id}/${action}`, {}),
    onSuccess: () => {
      invalidateStock()
      useToastStore.getState().success(ACTION_MESSAGE[action])
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}
