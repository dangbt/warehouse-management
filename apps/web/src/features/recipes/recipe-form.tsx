import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { WinDialog, WinGroupBox, WinSelect, WinInput } from '@wms/ui-winforms'
import { api } from '@/services/api'
import { UNIT_OPTIONS } from '@wms/shared'

const ingredientLine = z.object({
  ingredient_id: z.string().min(1, 'Chọn NL'),
  quantity: z.coerce.number().min(0.001, '> 0'),
  unit: z.string().min(1, 'Bắt buộc'),
})

const schema = z.object({
  menu_item: z.string().min(1, 'Chọn món'),
  name: z.string().min(1, 'Bắt buộc'),
  serving_size: z.coerce.number().min(1, '>= 1'),
  ingredients: z.array(ingredientLine).min(1, 'Ít nhất 1 nguyên liệu'),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  editData?: {
    id: string
    name: string
    menuItemId: string
    servingSize: number
    ingredients: { ingredientId: string; quantity: string; unit: string }[]
  } | null
  onClose: () => void
  onSave?: (data: FormData) => void
}

export function RecipeForm({ open, editData, onClose, onSave }: Props) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      menu_item: '',
      name: '',
      serving_size: 1,
      ingredients: [{ ingredient_id: '', quantity: 0, unit: '' }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' })

  const [menuItems, setMenuItems] = useState<{ value: string; label: string }[]>([])
  const [ingredientOptions, setIngredientOptions] = useState<{ value: string; label: string }[]>([])
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open) {
      setSubmitError('')
      Promise.all([api.get('/menu-items'), api.get('/ingredients?limit=1000')]).then(([m, i]) => {
        setMenuItems((m as { id: string; name: string }[]).map((x) => ({ value: x.id, label: x.name })))
        setIngredientOptions((i.data as { id: string; name: string }[]).map((x) => ({ value: x.id, label: x.name })))
        if (editData) {
          reset({
            menu_item: editData.menuItemId,
            name: editData.name,
            serving_size: editData.servingSize,
            ingredients: editData.ingredients.map((i) => ({
              ingredient_id: i.ingredientId,
              quantity: Number(i.quantity),
              unit: i.unit,
            })),
          })
        } else {
          reset({
            menu_item: '',
            name: '',
            serving_size: 1,
            ingredients: [{ ingredient_id: '', quantity: 0, unit: '' }],
          })
        }
      })
    }
  }, [open, editData, reset])

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitError('')
      await onSave?.(data)
      reset()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi')
    }
  }

  return (
    <WinDialog
      title={editData ? '✏️ Sửa Công Thức' : '🍳 Tạo Công Thức'}
      open={open}
      onClose={onClose}
      width={580}
      footer={
        <>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title min-w-[75px] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs bg-win-button border border-win-button-border min-w-[75px] cursor-pointer hover:bg-win-button-hover"
          >
            Huỷ
          </button>
        </>
      }
    >
      <WinGroupBox title="Thông tin công thức">
        <div className="space-y-2">
          <WinSelect label="Món ăn" {...register('menu_item')} options={menuItems} error={errors.menu_item?.message} />
          <WinInput label="Tên CT" {...register('name')} error={errors.name?.message} />
          <WinInput
            label="Serving size"
            type="number"
            {...register('serving_size')}
            error={errors.serving_size?.message}
          />
        </div>
      </WinGroupBox>

      <WinGroupBox title="Nguyên liệu">
        <button
          type="button"
          onClick={() => append({ ingredient_id: '', quantity: 0, unit: '' })}
          className="flex items-center gap-1 text-[11px] text-win-active-title hover:underline cursor-pointer mb-2"
        >
          <Plus size={12} /> Thêm NL
        </button>
        {errors.ingredients?.root && (
          <p className="text-[10px] text-win-error mb-1">{errors.ingredients.root.message}</p>
        )}
        {submitError && <p className="text-[11px] text-win-error font-semibold mb-1">⚠️ {submitError}</p>}

        <table className="w-full text-[11px] border border-win-grid-border">
          <thead>
            <tr className="bg-win-grid-header">
              <th className="p-1 text-left">Nguyên liệu</th>
              <th className="p-1 w-[70px]">Số lượng</th>
              <th className="p-1 w-[70px]">ĐVT</th>
              <th className="p-1 w-[30px]"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, i) => (
              <tr key={field.id} className="border-t border-win-grid-border">
                <td className="p-0.5">
                  <select
                    {...register(`ingredients.${i}.ingredient_id`)}
                    className="w-full border border-win-input-border px-1 py-0.5 text-[11px] bg-white"
                  >
                    <option value="">--</option>
                    {ingredientOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-0.5">
                  <input
                    type="number"
                    step="0.001"
                    {...register(`ingredients.${i}.quantity`)}
                    className="w-full border border-win-input-border px-1 py-0.5 text-[11px] text-right bg-white"
                  />
                </td>
                <td className="p-0.5">
                  <select
                    {...register(`ingredients.${i}.unit`)}
                    className="w-full border border-win-input-border px-1 py-0.5 text-[11px] bg-white"
                  >
                    <option value="">--</option>
                    {UNIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-0.5 text-center">
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="text-win-error cursor-pointer">
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
