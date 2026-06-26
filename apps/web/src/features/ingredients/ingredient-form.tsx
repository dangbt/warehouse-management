import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { WinDialog, WinGroupBox, WinInput, WinSelect } from '@wms/ui-winforms'
import { UNIT_OPTIONS } from '@wms/shared'
import { useIngredientGroups, useIngredients } from '@/data'

const optionalNumber = z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().nullable())

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  unit: z.string().min(1, 'Bắt buộc'),
  category: z.string().min(1, 'Bắt buộc'),
  cost_per_unit: z.coerce.number().min(0, 'Phải >= 0'),
  min_stock: z.coerce.number().min(0, 'Phải >= 0'),
  group_id: z.string().optional(),
  base_factor: optionalNumber.optional(),
  source_ingredient_id: z.string().optional(),
  yield_ratio: optionalNumber.optional(),
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

interface IngredientData {
  id: string
  name: string
  unit: string
  category: string
  costPerUnit?: string
  cost_per_unit?: number
  minStock?: string
  min_stock?: number
  groupId?: string | null
  baseFactor?: string | null
  sourceIngredientId?: string | null
  yieldRatio?: string | null
}

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  data: IngredientData | null
  onClose: () => void
  onSave?: (data: FormData) => void
}

export function IngredientForm({ open, mode, data, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [submitError, setSubmitError] = useState('')

  const { data: groups } = useIngredientGroups()
  const { data: ingRes } = useIngredients({ page: 1 })

  const groupOptions = [
    { value: '', label: '— Không thuộc nhóm —' },
    ...(groups ?? []).map((g) => ({ value: g.id, label: `${g.name} (gốc: ${g.baseUnit})` })),
  ]
  const sourceOptions = [
    { value: '', label: '— Không (mua ngoài) —' },
    ...(ingRes?.data ?? []).filter((i) => i.id !== data?.id).map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })),
  ]

  useEffect(() => {
    if (open) {
      setSubmitError('')
      reset(
        mode === 'edit' && data
          ? {
              name: data.name,
              unit: data.unit,
              category: data.category,
              cost_per_unit: Number(data.costPerUnit ?? data.cost_per_unit),
              min_stock: Number(data.minStock ?? data.min_stock),
              group_id: data.groupId ?? '',
              base_factor: data.baseFactor != null ? Number(data.baseFactor) : null,
              source_ingredient_id: data.sourceIngredientId ?? '',
              yield_ratio: data.yieldRatio != null ? Number(data.yieldRatio) : null,
            }
          : {
              name: '',
              unit: '',
              category: '',
              cost_per_unit: 0,
              min_stock: 0,
              group_id: '',
              base_factor: null,
              source_ingredient_id: '',
              yield_ratio: null,
            },
      )
    }
  }, [open, mode, data, reset])

  const onSubmit = async (formData: FormData) => {
    try {
      setSubmitError('')
      await onSave?.({
        ...formData,
        group_id: formData.group_id || null,
        source_ingredient_id: formData.source_ingredient_id || null,
      } as FormData)
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
      width={440}
      footer={
        <>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title rounded-sm min-w-[75px] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : 'OK'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs bg-win-button border border-win-button-border rounded-sm min-w-[75px] cursor-pointer hover:bg-win-button-hover"
          >
            Cancel
          </button>
        </>
      }
    >
      <div className="space-y-2">
        <WinGroupBox title="Thông tin nguyên liệu">
          <div className="space-y-2.5">
            <WinInput label="Tên" {...register('name')} error={errors.name?.message} />
            <WinSelect label="Đơn vị" {...register('unit')} options={units} error={errors.unit?.message} />
            <WinSelect label="Phân loại" {...register('category')} options={categories} error={errors.category?.message} />
            <WinInput label="Giá/đơn vị" type="number" {...register('cost_per_unit')} error={errors.cost_per_unit?.message} />
            <WinInput label="Tồn kho min" type="number" {...register('min_stock')} error={errors.min_stock?.message} />
          </div>
        </WinGroupBox>

        <WinGroupBox title="Nhóm & Bán thành phẩm (tuỳ chọn)">
          <div className="space-y-2.5">
            <WinSelect label="Nhóm" {...register('group_id')} options={groupOptions} />
            <WinInput
              label="Hệ số về nhóm"
              type="number"
              step="0.000001"
              placeholder="1 phần = 0.22 kg ⇒ 0.22"
              {...register('base_factor')}
            />
            <WinSelect label="Làm từ (nguồn)" {...register('source_ingredient_id')} options={sourceOptions} />
            <WinInput
              label="Định mức (yield)"
              type="number"
              step="0.0001"
              placeholder="1kg sống → 4 phần ⇒ 4"
              {...register('yield_ratio')}
            />
          </div>
        </WinGroupBox>

        {submitError && <p className="text-[11px] text-win-error font-semibold">⚠️ {submitError}</p>}
      </div>
    </WinDialog>
  )
}
