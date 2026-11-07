import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { useToastStore } from '@/stores/toast.store'

export interface InventoryPeriodStatus { lockedUntil: string | null }
export interface LockResult extends InventoryPeriodStatus { previousLockedUntil: string | null; costedMonths?: string[] }

const KEY = ['inventory-period'] as const

export function useInventoryPeriod() {
  return useQuery<InventoryPeriodStatus>({ queryKey: KEY, queryFn: async () => (await api.get('/inventory-period')) as InventoryPeriodStatus })
}

const done = (message: string) => () => {
  queryClient.invalidateQueries({ queryKey: KEY })
  queryClient.invalidateQueries({ queryKey: ['reports'] })
  useToastStore.getState().success(message)
}
const fail = (e: Error) => useToastStore.getState().error(e.message)

export function useLockInventoryPeriod() {
  return useMutation({
    mutationFn: async (date: string) => (await api.post('/inventory-period/lock', { date })) as LockResult,
    onSuccess: done('Đã khoá sổ kho'),
    onError: fail,
  })
}

/** Mở khoá: truyền `date` để lùi ngày khoá, bỏ trống để mở khoá hoàn toàn. */
export function useReopenInventoryPeriod() {
  return useMutation({
    mutationFn: async (date?: string) => (await api.delete(`/inventory-period/lock${date ? `?date=${encodeURIComponent(date)}` : ''}`)) as LockResult,
    onSuccess: done('Đã mở khoá sổ kho'),
    onError: fail,
  })
}
