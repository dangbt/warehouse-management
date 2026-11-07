import { Controller, type Control, type FieldArrayWithId, type UseFormRegister } from 'react-hook-form'
import { WinSearchSelect } from '@wms/ui-winforms'
import { Plus, Trash2 } from 'lucide-react'
import { formatNumber, VAT_RATES, VAT_RATE_LABELS } from '@wms/shared'
import { useGridEnterNav } from '@/hooks/use-grid-enter-nav'
import { lineTotalPrice, computeLineVat, type VatLineInput } from './vat'
import { useTerm } from '@/data/use-features'

export interface IngredientOption {
  value: string
  label: string
  unit: string
}

interface Row extends VatLineInput {
  ingredient_id?: string
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kiểu form nằm ở import-order-form, tránh import vòng
  register: UseFormRegister<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- như trên
  control: Control<any>
  fields: FieldArrayWithId[]
  rows: Row[]
  ingredients: IngredientOption[]
  /** ĐVT theo id nguyên liệu — giữ cả những NL không còn trong kết quả tìm kiếm hiện tại. */
  unitMap: Record<string, string>
  onSearchIngredients: (q: string) => void
  ingredientsLoading?: boolean
  hasInvoice: boolean
  onAdd: () => void
  onRemove: (index: number) => void
  rootError?: string
}

const cell = 'w-full h-10 border border-win-input-border px-2 text-[14px] bg-white outline-none focus:border-win-input-focus'
const num = `${cell} text-right`
const th = 'px-2 py-2 font-semibold text-[13px] border-r border-win-grid-border last:border-r-0'

const vatRateOptions = VAT_RATES.map((r) => ({ value: r, label: VAT_RATE_LABELS[r] }))

const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()

/**
 * Bảng "Hàng tiền" của phiếu nhập — thứ tự cột theo luồng nhập liệu kiểu MISA:
 * Nguyên liệu → ĐVT → Số lượng → Hệ số → Đơn giá → Thành tiền → (Thuế) → HSD.
 * Enter nhảy ô kế tiếp; hết ô cuối của dòng cuối sẽ tự thêm dòng mới.
 */
export function ImportOrderItemsTable({
  register,
  control,
  fields,
  rows,
  ingredients,
  unitMap,
  onSearchIngredients,
  ingredientsLoading,
  hasInvoice,
  onAdd,
  onRemove,
  rootError,
}: Props) {
  const t = useTerm()
  const unitOf = (id?: string) => (id ? (unitMap[id] ?? '') : '')

  const onGridKeyDown = useGridEnterNav(onAdd)

  return (
    <div>
      <div className="overflow-x-auto border border-win-grid-border bg-white" onKeyDown={onGridKeyDown}>
        <table className="w-full text-[14px] border-collapse">
          <thead>
            <tr className="bg-win-grid-header border-b border-win-grid-border">
              <th className={`${th} w-[44px] text-center`}>#</th>
              <th className={`${th} text-left min-w-[220px]`}>{t('item')}</th>
              <th className={`${th} w-[70px] text-center`}>ĐVT</th>
              <th className={`${th} w-[100px] text-right`}>Số lượng</th>
              <th className={`${th} w-[90px] text-right`} title="1 ĐVT nhập = ? ĐVT tồn (vd 1 thùng = 24 chai)">
                Hệ số
              </th>
              <th className={`${th} w-[130px] text-right`}>Đơn giá</th>
              <th className={`${th} w-[130px] text-right`}>Thành tiền</th>
              {hasInvoice && <th className={`${th} w-[110px] text-center`}>% Thuế GTGT</th>}
              {hasInvoice && <th className={`${th} w-[110px] text-right`}>Tiền thuế</th>}
              <th className={`${th} w-[150px] text-center`}>Hạn sử dụng</th>
              <th className={`${th} w-[44px]`}></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, i) => {
              const row = rows[i] ?? {}
              const total = lineTotalPrice(row)
              const unit = unitOf(row.ingredient_id)
              return (
                <tr key={field.id} className="border-b border-win-grid-border">
                  <td className="px-2 text-center text-win-text-secondary">{i + 1}</td>
                  <td className="p-1">
                    <Controller
                      name={`items.${i}.ingredient_id`}
                      control={control}
                      render={({ field: f }) => (
                        <WinSearchSelect
                          name={f.name}
                          value={f.value}
                          onChange={f.onChange}
                          onBlur={f.onBlur}
                          options={ingredients}
                          onSearch={onSearchIngredients}
                          loading={ingredientsLoading}
                          placeholder={t('item_choose_placeholder')}
                          triggerClassName="h-10 px-2 text-[14px]"
                        />
                      )}
                    />
                  </td>
                  <td className="px-2 text-center text-win-text-secondary">{unit || '—'}</td>
                  <td className="p-1">
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      data-testid={`item-${i}-quantity`}
                      {...register(`items.${i}.quantity`)}
                      onFocus={selectAll}
                      className={num}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      step="0.0001"
                      inputMode="decimal"
                      data-testid={`item-${i}-factor`}
                      {...register(`items.${i}.factor`)}
                      onFocus={selectAll}
                      className={num}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      data-testid={`item-${i}-price`}
                      {...register(`items.${i}.unit_price`)}
                      onFocus={selectAll}
                      title={unit ? `Đơn giá theo ${unit}` : 'Đơn giá theo ĐVT tồn'}
                      className={num}
                    />
                  </td>
                  <td className="px-2 text-right font-semibold">{formatNumber(total)}</td>
                  {hasInvoice && (
                    <td className="p-1">
                      <select data-testid={`item-${i}-vat-rate`} {...register(`items.${i}.vat_rate`)} className={cell}>
                        {vatRateOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {hasInvoice && (
                    <td className="px-2 text-right" data-testid={`item-${i}-vat-amount`}>
                      {formatNumber(computeLineVat(total, (row.vat_rate as never) ?? null))}
                    </td>
                  )}
                  <td className="p-1">
                    <input
                      type="date"
                      data-testid={`item-${i}-expiry`}
                      {...register(`items.${i}.expiry_date`)}
                      className={cell}
                    />
                  </td>
                  <td className="text-center">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        title="Xoá dòng"
                        onClick={() => onRemove(i)}
                        className="p-1.5 text-win-error hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 h-9 px-3 text-[14px] border border-win-active-title text-win-active-title bg-white hover:bg-win-menu-hover cursor-pointer"
        >
          <Plus size={16} /> Thêm dòng
        </button>
        <span className="text-[12px] text-win-text-secondary">Enter: sang ô kế tiếp, hết dòng cuối thì thêm dòng · Ctrl+Insert: thêm dòng · Ctrl+Delete: xoá dòng</span>
        {rootError && <span className="text-[13px] text-win-error ml-auto">{rootError}</span>}
      </div>
    </div>
  )
}
