import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { WinDialog, WinGroupBox, WinInput, WinSelect } from '@wms/ui-winforms'
import { useIngredients } from '@/data'

const optionalNumber = z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().positive().optional())

const schema = z.object({
  source_ingredient_id: z.string().min(1, 'Chọn nguyên liệu nguồn'),
  source_qty: z.coerce.number().min(0.001, 'Phải > 0'),
  output_ingredient_id: z.string().min(1, 'Chọn thành phẩm'),
  output_qty: optionalNumber,
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSave?: (data: FormData) => Promise<void> | void
}

interface Ing {
  id: string
  name: string
  unit: string
  yieldRatio?: string | null
  sourceIngredientId?: string | null
}

export function ProcessingForm({ open, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [submitError, setSubmitError] = useState('')
  const { data: ingRes } = useIngredients({ limit: 1000 })
  const ingredients = (ingRes?.data ?? []) as unknown as Ing[]

  useEffect(() => {
    if (open) {
      setSubmitError('')
      reset({ source_ingredient_id: '', source_qty: 0, output_ingredient_id: '', output_qty: undefined, note: '' })
    }
  }, [open, reset])

  const outputId = watch('output_ingredient_id')
  const sourceQty = watch('source_qty')
  const output = ingredients.find((i) => i.id === outputId)
  const yieldRatio = output?.yieldRatio != null ? Number(output.yieldRatio) : null
  const suggested = yieldRatio != null && sourceQty ? +(Number(sourceQty) * yieldRatio).toFixed(3) : null

  const sourceOptions = ingredients.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }))
  // Ưu tiên thành phẩm là bán thành phẩm (có nguồn); nếu chưa có thì cho chọn tất cả
  const btp = ingredients.filter((i) => i.sourceIngredientId)
  const outputOptions = (btp.length ? btp : ingredients).map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }))

  const onSubmit = async (formData: FormData) => {
    try {
      setSubmitError('')
      await onSave?.(formData)
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi tạo phiếu chế biến')
    }
  }

  return (
    <WinDialog
      title="🍳 Tạo Phiếu Chế Biến"
      open={open}
      onClose={onClose}
      width={440}
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
      <WinGroupBox title="Nguyên liệu sống → Bán thành phẩm">
        <div className="space-y-2.5">
          <WinSelect
            label="Nguyên liệu nguồn"
            {...register('source_ingredient_id')}
            options={sourceOptions}
            error={errors.source_ingredient_id?.message}
          />
          <WinInput label="Lượng nguồn dùng" type="number" step="0.001" {...register('source_qty')} error={errors.source_qty?.message} />
          <WinSelect
            label="Thành phẩm (BTP)"
            {...register('output_ingredient_id')}
            options={outputOptions}
            error={errors.output_ingredient_id?.message}
          />
          <WinInput
            label="Lượng thực thu"
            type="number"
            step="0.001"
            placeholder={suggested != null ? `Gợi ý theo yield: ${suggested}` : 'Bỏ trống = theo định mức'}
            {...register('output_qty')}
          />
          {suggested != null && (
            <p className="text-[11px] text-win-info">
              💡 Định mức: {sourceQty} × {yieldRatio} = <b>{suggested}</b> {output?.unit}. Sửa lại nếu hao hụt khác.
            </p>
          )}
          <WinInput label="Ghi chú" {...register('note')} />
          {submitError && <p className="text-[11px] text-win-error font-semibold">⚠️ {submitError}</p>}
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
