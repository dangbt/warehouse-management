import { Warehouse as WarehouseIcon } from 'lucide-react'
import { WinGroupBox } from '@wms/ui-winforms'
import { formatNumber } from '@wms/shared'
import { useWarehouses } from '@/data/use-warehouses'

export interface StockByWarehouse {
  warehouseId: string
  qty: string
}

/** Tồn tổng + tồn từng kho của 1 mã hàng. Ẩn khi hệ thống chỉ có 1 kho. */
export function WarehouseStockPanel({ unit, total, stocks }: { unit: string; total: string; stocks?: StockByWarehouse[] }) {
  const { data } = useWarehouses()
  const warehouses = data ?? []
  if (warehouses.length <= 1) return null
  const qtyOf = new Map((stocks ?? []).map((s) => [s.warehouseId, s.qty]))
  return (
    <div className="border-t border-win-grid-border" data-testid="warehouse-stock-panel">
      <WinGroupBox title={`Tồn theo kho — tổng ${formatNumber(total)} ${unit}`} icon={<WarehouseIcon size={16} strokeWidth={1.75} />}>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-win-base">
          {warehouses.map((w) => (
            <span key={w.id} className={w.active ? '' : 'text-win-text-secondary'}>
              {w.name}: <strong>{formatNumber(qtyOf.get(w.id) ?? 0)}</strong> {unit}
            </span>
          ))}
        </div>
      </WinGroupBox>
    </div>
  )
}
