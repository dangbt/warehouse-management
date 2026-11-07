import { WinSelect } from '@wms/ui-winforms'
import { useWarehouses } from '@/data/use-warehouses'

interface Props {
  value: string
  onChange: (id: string) => void
  /** Cho phép chọn "Tất cả kho" (filter). Form chứng từ thì không. */
  allowAll?: boolean
  label?: string
  disabled?: boolean
  testId?: string
}

/** Ô chọn kho. Ẩn hoàn toàn khi hệ thống chỉ có 1 kho để không rối UI. */
export function WarehouseSelect({ value, onChange, allowAll, label, disabled, testId = 'warehouse-select' }: Props) {
  const { data } = useWarehouses({ activeOnly: !allowAll })
  const list = data ?? []
  if (list.length <= 1) return null
  const options = list.map((w) => ({ value: w.id, label: w.isDefault ? `${w.name} (mặc định)` : w.name }))
  return (
    <div className="flex items-center gap-2" data-testid={`${testId}-wrap`}>
      <WinSelect
        label={label}
        aria-label={label ?? 'Kho'}
        data-testid={testId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        options={options}
        emptyLabel={allowAll ? 'Tất cả kho' : null}
      />
    </div>
  )
}
