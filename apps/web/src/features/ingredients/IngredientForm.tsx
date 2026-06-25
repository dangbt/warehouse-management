import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { WinDialog, WinGroupBox, WinInput, WinSelect } from '@wms/ui-winforms'
import { UNIT_OPTIONS } from '@/utils/constants'

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  unit: z.string().min(1, 'Bắt buộc'),
  category: z.string().min(1, 'Bắt buộc'),
  cost_per_unit: z.coerce.number().min(0, 'Phải >= 0'),
  min_stock: z.coerce.number().min(0, 'Phải >= 0'),
})

type FormData = z.infer<typeof schema>

const categories = [
  { value: 'Thịt', label: 'Thịt' },
  { value: 'Rau', label: 'Rau' },
  { value: 'Gia vị', label: 'Gia vị' },
  { value: 'Đồ khô', label: 'Đồ khô' },
  { value: 'Đồ uống', label: 'Đồ uống' },
]

const units = UNIT_OPTIONS

interface IngredientData { id: string; name: string; unit: string; category: string; costPerUnit?: string; cost_per_unit?: number; minStock?: string; min_stock?: number }

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  data: IngredientData | null
  onClose: () => void
  onSave?: (data: FormData) => void
}

export function IngredientForm({ open, mode, data, onClose, onSave }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open) {
      setSubmitError('')
      reset(mode === 'edit' && data ? { name: data.name, unit: data.unit, category: data.category, cost_per_unit: Number(data.costPerUnit ?? data.cost_per_unit), min_stock: Number(data.minStock ?? data.min_stock) } : { name: '', unit: '', category: '', cost_per_unit: 0, min_stock: 0 })
    }
  }, [open, mode, data, reset])

  const onSubmit = async (formData: FormData) => {
    try {
      setSubmitError('')
      await onSave?.(formData)
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi lưu nguyên liệu')
    }
  }

  return (
    <WinDialog
      title={mode === 'add' ? '🆕 Thêm Nguyên Liệu' : '✏️ Sửa Nguyên Liệu'}
      open={open}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button onClick={handleSubmit(onSubmit)} className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title rounded-sm min-w-[75px] cursor-pointer">OK</button>
          <button onClick={onClose} className="px-4 py-1 text-xs bg-win-button border border-win-button-border rounded-sm min-w-[75px] cursor-pointer hover:bg-win-button-hover">Cancel</button>
        </>
      }
    >
      <WinGroupBox title="Thông tin nguyên liệu">
        <div className="space-y-2.5">
          <WinInput label="Tên" {...register('name')} error={errors.name?.message} />
          <WinSelect label="Đơn vị" {...register('unit')} options={units} error={errors.unit?.message} />
          <WinSelect label="Phân loại" {...register('category')} options={categories} error={errors.category?.message} />
          <WinInput label="Giá/đơn vị" type="number" {...register('cost_per_unit')} error={errors.cost_per_unit?.message} />
          <WinInput label="Tồn kho min" type="number" {...register('min_stock')} error={errors.min_stock?.message} />
          {submitError && <p className="text-[11px] text-win-error font-semibold">⚠️ {submitError}</p>}
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
