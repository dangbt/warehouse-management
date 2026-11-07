import { useCallback, useMemo, useState } from 'react'
import { useWarehouses } from '@/data/use-warehouses'
import type { Warehouse } from '@/data/use-warehouses'

const STORAGE_KEY = 'wms.lastWarehouseId'

function readLast(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Kho cho form chứng từ: ưu tiên kho dùng gần nhất (còn hoạt động), rồi đến kho mặc định. */
export function pickWarehouseId(list: Warehouse[], last: string): string {
  return list.find((w) => w.id === last)?.id ?? list.find((w) => w.isDefault)?.id ?? list[0]?.id ?? ''
}

export function rememberWarehouse(id: string) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* localStorage không khả dụng — bỏ qua */
  }
}

/**
 * Lựa chọn kho cho 1 form chứng từ. `multi=false` (chỉ 1 kho) ⇒ UI ẩn ô Kho;
 * `initialId`: kho có sẵn của chứng từ đang sửa. `warehouseId` luôn là kho hợp lệ (hoặc '' khi chưa tải xong → API tự dùng kho mặc định).
 */
export function useWarehouseChoice(initialId?: string) {
  const { data } = useWarehouses({ activeOnly: true })
  const warehouses = useMemo(() => data ?? [], [data])
  const [picked, setPicked] = useState(initialId ?? '')
  const [prevInitial, setPrevInitial] = useState(initialId)
  // Form sửa chứng từ khác ⇒ quay về kho của chứng từ đó.
  if (prevInitial !== initialId) {
    setPrevInitial(initialId)
    setPicked(initialId ?? '')
  }
  const warehouseId = picked && warehouses.some((w) => w.id === picked) ? picked : pickWarehouseId(warehouses, readLast())
  const setWarehouseId = useCallback((id: string) => {
    setPicked(id)
    rememberWarehouse(id)
  }, [])
  return { warehouses, multi: warehouses.length > 1, warehouseId, setWarehouseId }
}
