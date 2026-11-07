import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useToastStore } from '@/stores/toast.store'

export interface Warehouse {
  id: string
  code: string
  name: string
  address: string | null
  isDefault: boolean
  active: boolean
}

export interface WarehouseInput {
  code?: string
  name?: string
  address?: string | null
  is_default?: boolean
  active?: boolean
}

// Danh mục kho ít đổi và được dùng ở mọi form chứng từ ⇒ cache cấp module + subscribe, không phụ thuộc QueryClientProvider.
const cache = new Map<string, Promise<Warehouse[]>>()
const listeners = new Set<() => void>()

function loadWarehouses(activeOnly: boolean): Promise<Warehouse[]> {
  const key = activeOnly ? 'active' : 'all'
  let p = cache.get(key)
  if (!p) {
    p = Promise.resolve(api.get(activeOnly ? '/warehouses?active=true' : '/warehouses'))
      .then((res) => (Array.isArray(res) ? (res as Warehouse[]) : []))
      .catch(() => {
        cache.delete(key) // lỗi tạm thời: cho phép thử lại ở lần mount sau
        return [] as Warehouse[]
      })
    cache.set(key, p)
  }
  return p
}

/** Xoá cache + báo mọi component đang dùng tải lại (sau khi tạo/sửa/xoá kho). */
export function invalidateWarehouses() {
  cache.clear()
  listeners.forEach((fn) => fn())
}

export function useWarehouses(opts: { activeOnly?: boolean } = {}) {
  const activeOnly = !!opts.activeOnly
  const [data, setData] = useState<Warehouse[] | undefined>(undefined)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const fn = () => setTick((n) => n + 1)
    listeners.add(fn)
    return () => void listeners.delete(fn)
  }, [])
  useEffect(() => {
    let cancelled = false
    void loadWarehouses(activeOnly).then((list) => !cancelled && setData(list))
    return () => {
      cancelled = true
    }
  }, [activeOnly, tick])
  return { data, isLoading: data === undefined, refetch: invalidateWarehouses }
}

const refresh = invalidateWarehouses
const fail = (e: Error) => useToastStore.getState().error(e.message)

export function useCreateWarehouse() {
  return useMutation({
    mutationFn: (data: WarehouseInput) => api.post('/warehouses', data),
    onSuccess: () => {
      refresh()
      useToastStore.getState().success('Tạo kho thành công')
    },
    onError: fail,
  })
}

export function useUpdateWarehouse() {
  return useMutation({
    mutationFn: ({ id, ...data }: WarehouseInput & { id: string }) => api.put(`/warehouses/${id}`, data),
    onSuccess: () => {
      refresh()
      useToastStore.getState().success('Cập nhật kho thành công')
    },
    onError: fail,
  })
}

export function useDeleteWarehouse() {
  return useMutation({
    mutationFn: (id: string) => api.delete(`/warehouses/${id}`),
    onSuccess: () => {
      refresh()
      useToastStore.getState().success('Đã xoá kho')
    },
    onError: fail,
  })
}
