import { ArrowUpFromLine, TriangleAlert } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { itemLabel } from '@/utils/item-label'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useFormHotkeys } from '@/hooks/use-form-hotkeys'
import { WinDialog, WinGroupBox, WinSearchSelect, WinSelect, WinInput } from '@wms/ui-winforms'
import { api } from '@/services/api'
import { VoucherFields } from '@/components/voucher-fields'
import { useVoucherFields } from '@/data/use-vouchers'
import type { VoucherPayload } from '@/data/use-vouchers'
import { useTerm } from '@/data/use-features'
import { MatrixAddButton } from '@/components/matrix-picker/matrix-add-button'
import { mergeExportLines, type MatrixLine } from '@/components/matrix-picker/matrix-logic'

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

/** Dữ liệu điền sẵn khi nhân bản phiếu xuất (ngày/số CT luôn để mới). */
export interface StockExportSeed {
  ingredient: { id: string; name: string; unit: string; currentStock?: string }
  quantity: number
  reason: string
  note?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSave?: (data: FormData & VoucherPayload) => void | Promise<unknown>
  seed?: StockExportSeed | null
}

export function StockExportForm({ open, onClose, onSave, seed }: Props) {
  const t = useTerm()
  const schema = useMemo(() => makeSchema(t('item_lower')), [t])
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [ingredients, setIngredients] = useState<{ value: string; label: string }[]>([])
  const [ingLoading, setIngLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const voucher = useVoucherFields('EXPORT', open)
  const [lines, setLines] = useState<MatrixLine[]>([])
  // Số CT tự đặt chỉ dùng cho phiếu đầu tiên khi xuất nhiều dòng từ ma trận; phiếu sau để server tự sinh.
  const voucherNoUsed = useRef(false)

  const fetchIngredients = useCallback((search: string) => {
    setIngLoading(true)
    api
      .get(`/ingredients?limit=10&search=${encodeURIComponent(search)}`)
      .then((res) => {
        const list = (res.data as { id: string; name: string; sku?: string | null; currentStock: string; unit: string }[]).map((i) => ({
          value: i.id,
          label: `${itemLabel(i)} (tồn: ${i.currentStock} ${i.unit})`,
        }))
        // Nhân bản: NL của phiếu gốc luôn có trong danh sách chọn.
        if (seed && !list.some((o) => o.value === seed.ingredient.id)) {
          list.unshift({ value: seed.ingredient.id, label: seed.ingredient.name })
        }
        setIngredients(list)
      })
      .finally(() => setIngLoading(false))
  }, [seed])

  useEffect(() => {
    if (open) {
      reset(seed ? { ingredient_id: seed.ingredient.id, quantity: seed.quantity, reason: seed.reason, note: seed.note ?? '' } : undefined)
      setLines([])
      voucherNoUsed.current = false
      setSubmitError('')
      fetchIngredients('')
    }
  }, [open, seed, reset, fetchIngredients])

  const onSubmit = async (data: FormData, keepOpen = false) => {
    try {
      setSubmitError('')
      await onSave?.({ ...data, ...voucher.payload() })
      reset()
      if (!keepOpen) onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi xuất kho')
    }
  }

  const { requestClose, guard } = useFormHotkeys({
    open,
    isDirty,
    onClose,
    onSave: () => void handleSubmit((d) => onSubmit(d))(),
    onSaveNew: () => void handleSubmit((d) => onSubmit(d, true))(),
  })

  /** Xuất nhiều biến thể thêm từ ma trận: mỗi dòng 1 phiếu xuất (API xuất kho nhận 1 mã hàng/lần). */
  const submitLines = async () => {
    const { reason, note } = getValues()
    if (!reason) return setSubmitError('Chọn lý do')
    try {
      setSubmitError('')
      // Bỏ từng dòng khỏi `lines` ngay khi lưu xong: lỗi giữa chừng thì bấm Lưu lại không xuất trùng dòng đã lưu.
      for (const l of lines) {
        const { voucher_date, voucher_no } = voucher.payload()
        await onSave?.({ ingredient_id: l.itemId, quantity: l.quantity, reason, note, voucher_date, voucher_no: voucherNoUsed.current ? undefined : voucher_no })
        voucherNoUsed.current = true
        setLines((cur) => cur.filter((x) => x.itemId !== l.itemId))
      }
      reset()
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi xuất kho'
      setSubmitError(`${msg} — các dòng đã xuất thành công đã được bỏ khỏi danh sách, dòng còn lại chưa xuất.`)
    }
  }

  /** Gộp dòng từ ma trận rồi kiểm lại tồn trên tổng sau gộp (mở popup nhiều lần cho cùng biến thể). */
  const addMatrixLines = (incoming: MatrixLine[]) => {
    const res = mergeExportLines(lines, incoming)
    const bad = Object.keys(res.errors)
    if (bad.length > 0) {
      const names = incoming.filter((l) => res.errors[l.itemId]).map((l) => `${l.productName} · ${l.variantLabel} (${res.errors[l.itemId]})`)
      return setSubmitError(`Tổng sau khi gộp vượt tồn: ${names.join('; ')}`)
    }
    setSubmitError('')
    setLines(res.lines)
  }

  return (
    <WinDialog
      title="Xuất Kho"
      icon={<ArrowUpFromLine size={16} strokeWidth={1.75} />}
      open={open}
      onClose={requestClose}
      width={440}
      footer={
        <>
          <button
            onClick={() => (lines.length > 0 ? void submitLines() : void handleSubmit((d) => onSubmit(d))())}
            disabled={isSubmitting}
            className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title min-w-[75px] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Đang xuất...' : 'Xuất'}
          </button>
          <button
            onClick={requestClose}
            className="px-4 py-1 text-xs bg-win-button border border-win-button-border min-w-[75px] cursor-pointer hover:bg-win-button-hover"
          >
            Huỷ
          </button>
        </>
      }
    >
      <WinGroupBox title="Thông tin xuất kho">
        <div className="space-y-2.5">
          <VoucherFields {...voucher} />
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
            <MatrixAddButton mode="export" onConfirm={addMatrixLines} />
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
      {guard}
    </WinDialog>
  )
}
