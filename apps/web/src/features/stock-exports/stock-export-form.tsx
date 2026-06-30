import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect, useCallback } from 'react'
import { WinDialog, WinGroupBox, WinSearchSelect, WinSelect, WinInput } from '@wms/ui-winforms'
import { api } from '@/services/api'

const schema = z.object({
  ingredient_id: z.string().min(1, 'Chọn nguyên liệu'),
  quantity: z.coerce.number().min(0.01, 'Phải > 0'),
  reason: z.string().min(1, 'Chọn lý do'),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const reasons = [
  { value: 'DAMAGED', label: 'Hỏng' },
  { value: 'EXPIRED', label: 'Hết hạn' },
  { value: 'RETURN', label: 'Trả NCC' },
  { value: 'INTERNAL_USE', label: 'Sử dụng nội bộ' },
  { value: 'OTHER', label: 'Khác' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSave?: (data: FormData) => void
}

export function StockExportForm({ open, onClose, onSave }: Props) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [ingredients, setIngredients] = useState<{ value: string; label: string }[]>([])
  const [ingLoading, setIngLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fetchIngredients = useCallback((search: string) => {
    setIngLoading(true)
    api
      .get(`/ingredients?limit=10&search=${encodeURIComponent(search)}`)
      .then((res) => {
        setIngredients(
          (res.data as { id: string; name: string; currentStock: string; unit: string }[]).map((i) => ({
            value: i.id,
            label: `${i.name} (tồn: ${i.currentStock} ${i.unit})`,
          })),
        )
      })
      .finally(() => setIngLoading(false))
  }, [])

  useEffect(() => {
    if (open) {
      reset()
      setSubmitError('')
      fetchIngredients('')
    }
  }, [open, reset, fetchIngredients])

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitError('')
      await onSave?.(data)
      reset()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi xuất kho')
    }
  }

  return (
    <WinDialog
      title="📤 Xuất Kho"
      open={open}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title min-w-[75px] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Đang xuất...' : 'Xuất'}
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
      <WinGroupBox title="Thông tin xuất kho">
        <div className="space-y-2.5">
          <Controller
            name="ingredient_id"
            control={control}
            render={({ field }) => (
              <WinSearchSelect
                label="Nguyên liệu"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={ingredients}
                onSearch={fetchIngredients}
                loading={ingLoading}
                error={errors.ingredient_id?.message}
              />
            )}
          />
          <WinInput
            label="Số lượng"
            type="number"
            step="0.01"
            {...register('quantity')}
            error={errors.quantity?.message}
          />
          <WinSelect label="Lý do" {...register('reason')} options={reasons} error={errors.reason?.message} />
          <WinInput label="Ghi chú" {...register('note')} />
          {submitError && <p className="text-[11px] text-win-error font-semibold">⚠️ {submitError}</p>}
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
