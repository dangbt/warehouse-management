import type { Column } from '@wms/ui-winforms'
import { useWarehouses } from '@/data/use-warehouses'

/** Cột "Kho" cho danh sách chứng từ — rỗng khi chỉ có 1 kho để bảng không thừa cột. */
export function useWarehouseColumn<T>(getId: (row: T) => string | null | undefined): Column<T>[] {
  const { data } = useWarehouses()
  const list = data ?? []
  if (list.length <= 1) return []
  const names = new Map(list.map((w) => [w.id, w.name]))
  return [{ key: 'warehouseId', header: 'Kho', width: 120, render: (r: T) => names.get(getId(r) ?? '') ?? '' } as Column<T>]
}
