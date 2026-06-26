import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { WinDialog, WinGroupBox, WinSelect, WinInput } from '@wms/ui-winforms'
import { api } from '@/services/api'

const itemSchema = z.object({
  ingredient_id: z.string().min(1, 'Chọn NL'),
  quantity: z.coerce.number().min(0.01, '> 0'),
  unit_price: z.coerce.number().min(0, '>= 0'),
  expiry_date: z.string().optional(),
})

const schema = z.object({
  supplier_id: z.string().min(1, 'Chọn NCC'),
  note: z.string().optional(),
  paid: z.boolean().default(true),
  items: z.array(itemSchema).min(1, 'Ít nhất 1 dòng'),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSave?: (data: FormData) => void
}

export function ImportOrderForm({ open, onClose, onSave }: Props) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplier_id: '',
      note: '',
      items: [{ ingredient_id: '', quantity: 0, unit_price: 0, expiry_date: '' }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const total = items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unit_price || 0), 0)

  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([])
  const [ingredients, setIngredients] = useState<{ value: string; label: string }[]>([])
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open) {
      reset({ supplier_id: '', note: '', paid: true, items: [{ ingredient_id: '', quantity: 0, unit_price: 0, expiry_date: '' }] })
      setSubmitError('')
      Promise.all([api.get('/suppliers?limit=100'), api.get('/ingredients?limit=100')]).then(([s, i]) => {
        setSuppliers((s.data as { id: string; name: string }[]).map((x) => ({ value: x.id, label: x.name })))
        setIngredients((i.data as { id: string; name: string }[]).map((x) => ({ value: x.id, label: x.name })))
      })
    }
  }, [open, reset])

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitError('')
      await onSave?.(data)
      reset()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi tạo phiếu')
    }
  }

  if (!open) return null

  return (
    <WinDialog
      title="📄 Tạo Phiếu Nhập Kho"
      open={open}
      onClose={onClose}
      width={680}
      footer={
        <>
          <span className="text-xs mr-auto font-semibold">Tổng: {total.toLocaleString()}₫</span>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title rounded-sm min-w-[75px] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs bg-win-button border border-win-button-border rounded-sm min-w-[75px] cursor-pointer hover:bg-win-button-hover"
          >
            Huỷ
          </button>
        </>
      }
    >
      <WinGroupBox title="Thông tin chung">
        <div className="space-y-2">
          <WinSelect
            label="Nhà cung cấp"
            {...register('supplier_id')}
            options={suppliers}
            error={errors.supplier_id?.message}
          />
          <WinInput label="Ghi chú" {...register('note')} />
          <label className="flex items-center gap-2 text-[11px] mt-1">
            <input type="checkbox" {...register('paid')} className="w-3 h-3" />
            Đã thanh toán cho NCC
          </label>
        </div>
      </WinGroupBox>

      <WinGroupBox title="Chi tiết nguyên liệu">
        <button
          type="button"
          onClick={() => append({ ingredient_id: '', quantity: 0, unit_price: 0, expiry_date: '' })}
          className="flex items-center gap-1 text-[11px] text-win-active-title hover:underline cursor-pointer mb-2"
        >
          <Plus size={12} /> Thêm dòng
        </button>
        {errors.items?.root && <p className="text-[10px] text-win-error mb-1">{errors.items.root.message}</p>}
        {submitError && <p className="text-[11px] text-win-error font-semibold mb-1">⚠️ {submitError}</p>}

        <table className="w-full text-[11px] border border-win-grid-border">
          <thead>
            <tr className="bg-win-grid-header">
              <th className="p-1 text-left w-[180px]">Nguyên liệu</th>
              <th className="p-1 w-[70px]">Số lượng</th>
              <th className="p-1 w-[100px]">Đơn giá</th>
              <th className="p-1 w-[90px]">Thành tiền</th>
              <th className="p-1 w-[100px]">HSD</th>
              <th className="p-1 w-[30px]"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, i) => (
              <tr key={field.id} className="border-t border-win-grid-border">
                <td className="p-0.5">
                  <select
                    {...register(`items.${i}.ingredient_id`)}
                    className="w-full border border-win-input-border px-1 py-0.5 text-[11px] rounded-sm bg-white"
                  >
                    <option value="">--</option>
                    {ingredients.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-0.5">
                  <input
                    type="number"
                    step="0.01"
                    {...register(`items.${i}.quantity`)}
                    className="w-full border border-win-input-border px-1 py-0.5 text-[11px] rounded-sm text-right"
                  />
                </td>
                <td className="p-0.5">
                  <input
                    type="number"
                    {...register(`items.${i}.unit_price`)}
                    className="w-full border border-win-input-border px-1 py-0.5 text-[11px] rounded-sm text-right"
                  />
                </td>
                <td className="p-0.5 text-right pr-2">
                  {((items[i]?.quantity || 0) * (items[i]?.unit_price || 0)).toLocaleString()}
                </td>
                <td className="p-0.5">
                  <input
                    type="date"
                    {...register(`items.${i}.expiry_date`)}
                    className="w-full border border-win-input-border px-1 py-0.5 text-[11px] rounded-sm"
                  />
                </td>
                <td className="p-0.5 text-center">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-win-error hover:opacity-70 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </WinGroupBox>
    </WinDialog>
  )
}
