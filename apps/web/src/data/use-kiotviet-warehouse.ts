import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export interface BranchWarehouseMap {
  /** Kho dùng khi chi nhánh không có trong mapping; null ⇒ kho mặc định. */
  defaultWarehouseId: string | null
  /** branchId KiotViet → warehouseId */
  branches: Record<string, string>
}

export function useKiotVietWarehouseMap(enabled = true) {
  return useQuery<BranchWarehouseMap>({
    queryKey: QUERY_KEYS.kiotvietWarehouseMap,
    enabled,
    queryFn: () => api.get('/kiotviet/warehouse-mapping'),
  })
}

export function useSaveKiotVietWarehouseMap() {
  return useMutation({
    mutationFn: (data: BranchWarehouseMap) => api.put('/kiotviet/warehouse-mapping', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kiotvietWarehouseMap })
      useToastStore.getState().success('Đã lưu mapping chi nhánh → kho')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}
