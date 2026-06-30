import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState, useCallback } from 'react'
import { WinDialog, WinGroupBox, WinInput, WinSearchSelect } from '@wms/ui-winforms'
import { api } from '@/services/api'

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
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [submitError, setSubmitError] = useState('')

  // Search nguồn (tất cả NL)
  const [sourceOptions, setSourceOptions] = useState<{ value: string; label: string }[]>([])
  const [sourceLoading, setSourceLoading] = useState(false)
  const fetchSource = useCallback((q: string) => {
    setSourceLoading(true)
    api.get(`/ingredients?limit=10&search=${encodeURIComponent(q)}`).then((res) => {
      setSourceOptions((res.data as Ing[]).map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })))
    }).finally(() => setSourceLoading(false))
  }, [])

  // Search BTP (chỉ NL có sourceIngredientId)
  const [outputOptions, setOutputOptions] = useState<{ value: string; label: string }[]>([])
  const [outputLoading, setOutputLoading] = useState(false)
  const [allOutputs, setAllOutputs] = useState<Ing[]>([])
  const fetchOutput = useCallback((q: string) => {
    setOutputLoading(true)
    api.get(`/ingredients?limit=50&search=${encodeURIComponent(q)}`).then((res) => {
      const data = res.data as Ing[]
      const btp = data.filter((i) => i.sourceIngredientId)
      const list = btp.length ? btp : data
      setAllOutputs(list)
      setOutputOptions(list.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })))
    }).finally(() => setOutputLoading(false))
  }, [])

  useEffect(() => {
    if (open) {
      setSubmitError('')
      reset({ source_ingredient_id: '', source_qty: 0, output_ingredient_id: '', output_qty: undefined, note: '' })
      fetchSource('')
      fetchOutput('')
    }
  }, [open, reset, fetchSource, fetchOutput])

  const outputId = watch('output_ingredient_id')
  const sourceQty = watch('source_qty')
  const output = allOutputs.find((i) => i.id === outputId)
  const yieldRatio = output?.yieldRatio != null ? Number(output.yieldRatio) : null
  const suggested = yieldRatio != null && sourceQty ? +(Number(sourceQty) * yieldRatio).toFixed(3) : null

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
          <Controller
            name="source_ingredient_id"
            control={control}
            render={({ field }) => (
              <WinSearchSelect
                label="Nguyên liệu nguồn"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={sourceOptions}
                onSearch={fetchSource}
                loading={sourceLoading}
                error={errors.source_ingredient_id?.message}
              />
            )}
          />
          <WinInput label="Lượng nguồn dùng" type="number" step="0.001" {...register('source_qty')} error={errors.source_qty?.message} />
          <Controller
            name="output_ingredient_id"
            control={control}
            render={({ field }) => (
              <WinSearchSelect
                label="Thành phẩm (BTP)"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={outputOptions}
                onSearch={fetchOutput}
                loading={outputLoading}
                error={errors.output_ingredient_id?.message}
              />
            )}
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
