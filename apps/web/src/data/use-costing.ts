import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { useToastStore } from '@/stores/toast.store'

export type CostingMethod = 'AVG_PERIOD' | 'AVG_MOVING' | 'FIFO'

export const COSTING_METHOD_LABELS: Record<CostingMethod, string> = {
  AVG_PERIOD: 'Bình quân cuối kỳ',
  AVG_MOVING: 'Bình quân tức thời',
  FIFO: 'Nhập trước – xuất trước (FIFO)',
}

export interface CostingSettings { costingMethod: CostingMethod; hasTransactions: boolean }
export interface CostingRunResult {
  month: string
  method: CostingMethod
  ingredients: number
  processed: number
  updated: number
  totalOutValue: number
}

const KEY = ['costing-settings'] as const
const unwrap = <T,>(res: { data: T } | T): T => (res && typeof res === 'object' && 'data' in res ? (res as { data: T }).data : (res as T))

export function useCostingSettings() {
  return useQuery<CostingSettings>({
    queryKey: KEY,
    queryFn: async () => unwrap<CostingSettings>(await api.get('/costing/settings')),
  })
}

export function useUpdateCostingMethod() {
  return useMutation({
    mutationFn: (v: { costing_method: CostingMethod; confirm?: boolean }) => api.put('/costing/settings', v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      useToastStore.getState().success('Đã lưu phương pháp tính giá xuất kho')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}

export function useRunCosting() {
  return useMutation({
    mutationFn: async (month: string) => unwrap<CostingRunResult>(await api.post('/costing/run', { month })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      useToastStore.getState().success('Đã tính giá xuất kho')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}
