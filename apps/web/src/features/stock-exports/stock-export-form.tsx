import { ArrowUpFromLine, TriangleAlert } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { itemLabel } from '@/utils/item-label'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { WinDialog, WinGroupBox, WinSearchSelect, WinSelect, WinInput } from '@wms/ui-winforms'
import { api } from '@/services/api'
import { useTerm } from '@/data/use-features'
import { MatrixAddButton } from '@/components/matrix-picker/matrix-add-button'
import { mergeLines, type MatrixLine } from '@/components/matrix-picker/matrix-logic'

const makeSchema = (itemLower: string) => z.object({
  ingredient_id: z.string().min(1, `Chọn ${itemLower}`),
  quantity: z.coerce.number().min(0.01, 'Phải > 0'),
  reason: z.string().min(1, 'Chọn lý do'),
  note: z.string().optional(),
})

type FormData = z.infer<ReturnType<typeof makeSchema>>

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
  onSave?: (data: FormData) => void | Promise<unknown>
}

export function StockExportForm({ open, onClose, onSave }: Props) {
  const t = useTerm()
  const schema = useMemo(() => makeSchema(t('item_lower')), [t])
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [ingredients, setIngredients] = useState<{ value: string; label: string }[]>([])
  const [ingLoading, setIngLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [lines, setLines] = useState<MatrixLine[]>([])

  const fetchIngredients = useCallback((search: string) => {
    setIngLoading(true)
    api
      .get(`/ingredients?limit=10&search=${encodeURIComponent(search)}`)
      .then((res) => {
        setIngredients(
          (res.data as { id: string; name: string; sku?: string | null; currentStock: string; unit: string }[]).map((i) => ({
            value: i.id,
            label: `${itemLabel(i)} (tồn: ${i.currentStock} ${i.unit})`,
          })),
        )
      })
      .finally(() => setIngLoading(false))
  }, [])

  useEffect(() => {
    if (open) {
      reset()
      setLines([])
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

  /** Xuất nhiều biến thể thêm từ ma trận: mỗi dòng 1 phiếu xuất (API xuất kho nhận 1 mã hàng/lần). */
  const submitLines = async () => {
    const { reason, note } = getValues()
    if (!reason) return setSubmitError('Chọn lý do')
    try {
      setSubmitError('')
      for (const l of lines) await onSave?.({ ingredient_id: l.itemId, quantity: l.quantity, reason, note })
      setLines([])
      reset()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi xuất kho')
    }
  }

  return (
    <WinDialog
      title="Xuất Kho"
      icon={<ArrowUpFromLine size={16} strokeWidth={1.75} />}
      open={open}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button
            onClick={lines.length > 0 ? submitLines : handleSubmit(onSubmit)}
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
                label={t('item')}
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
          <div className="flex items-center gap-2">
            <MatrixAddButton mode="export" onConfirm={(ls) => setLines((cur) => mergeLines(cur, ls))} />
            <span className="text-[12px] text-win-text-secondary">Xuất nhiều biến thể cùng lúc</span>
          </div>
          {lines.length > 0 && (
            <table data-testid="matrix-lines" className="w-full text-win-base border border-win-grid-border">
              <tbody>
                {lines.map((l) => (
                  <tr key={l.itemId} className="border-b border-win-grid-border">
                    <td className="p-1">{l.productName} · {l.variantLabel}</td>
                    <td className="p-1 text-right w-16">{l.quantity}</td>
                    <td className="p-1 w-8">
                      <button type="button" title="Xoá dòng" onClick={() => setLines((cur) => cur.filter((x) => x.itemId !== l.itemId))} className="text-win-error cursor-pointer">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <WinInput label="Số lượng" type="number" step="0.01" {...register('quantity')} error={errors.quantity?.message} />
          <WinSelect label="Lý do" {...register('reason')} options={reasons} error={errors.reason?.message} />
          <WinInput label="Ghi chú" {...register('note')} />
          {submitError && (
            <p className="text-win-base text-win-error font-semibold">
              <TriangleAlert size={14} strokeWidth={2} className="inline -mt-0.5 mr-1" />
              {submitError}
            </p>
          )}
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
