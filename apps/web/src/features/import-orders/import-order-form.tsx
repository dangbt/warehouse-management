import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { WinDialog, WinGroupBox, WinSelect, WinInput } from '@wms/ui-winforms'
import { api } from '@/services/api'
import { formatCurrency, formatNumber, VAT_RATES, VAT_RATE_LABELS } from '@wms/shared'
import { lineTotalPrice, computeLineVat, computeVatTotals } from './vat'

const itemSchema = z.object({
  ingredient_id: z.string().min(1, 'Chọn NL'),
  quantity: z.coerce.number().min(0.01, '> 0'),
  // Hệ số quy đổi: 1 ĐVT nhập = factor ĐVT tồn (vd 1 thùng = 24 chai). Mặc định 1.
  factor: z.coerce.number().min(0.0001, '> 0').default(1),
  unit_price: z.coerce.number().min(0, '>= 0'),
  vat_rate: z.string().optional(),
  expiry_date: z.string().optional(),
})

const schema = z
  .object({
    supplier_id: z.string().min(1, 'Chọn NCC'),
    note: z.string().optional(),
    paid: z.boolean().default(false),
    has_invoice: z.boolean().default(false),
    invoice_symbol: z.string().optional(),
    invoice_no: z.string().optional(),
    invoice_date: z.string().optional(),
    purchase_address: z.string().optional(),
    items: z.array(itemSchema).min(1, 'Ít nhất 1 dòng'),
  })
  .superRefine((data, ctx) => {
    if (data.has_invoice) {
      if (!data.invoice_no?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['invoice_no'], message: 'Nhập số hoá đơn' })
      }
      if (!data.invoice_date?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['invoice_date'], message: 'Nhập ngày hoá đơn' })
      }
    }
  })

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSave?: (data: FormData) => void
}

const DEFAULT_ITEM = { ingredient_id: '', quantity: 0, factor: 1, unit_price: 0, vat_rate: '8', expiry_date: '' }

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
      paid: false,
      has_invoice: false,
      invoice_symbol: '',
      invoice_no: '',
      invoice_date: '',
      purchase_address: '',
      items: [{ ...DEFAULT_ITEM }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const hasInvoice = watch('has_invoice')
  const supplierId = watch('supplier_id')
  const totals = computeVatTotals(items ?? [], hasInvoice)

  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([])
  const [supplierMap, setSupplierMap] = useState<Record<string, { isIndividual: boolean; address: string | null }>>({})
  const [ingredients, setIngredients] = useState<{ value: string; label: string }[]>([])
  const [submitError, setSubmitError] = useState('')

  // Người bán cá nhân không có hoá đơn ⇒ hiện field "Địa chỉ mua hàng".
  const showPurchaseAddress = !hasInvoice && !!supplierId && !!supplierMap[supplierId]?.isIndividual

  useEffect(() => {
    if (open) {
      reset({
        supplier_id: '',
        note: '',
        paid: false,
        has_invoice: false,
        invoice_symbol: '',
        invoice_no: '',
        invoice_date: '',
        purchase_address: '',
        items: [{ ...DEFAULT_ITEM }],
      })
      setSubmitError('')
      Promise.all([api.get('/suppliers?limit=1000'), api.get('/ingredients?limit=1000')]).then(([s, i]) => {
        const supplierList = s.data as { id: string; name: string; isIndividual?: boolean; address?: string | null }[]
        setSuppliers(supplierList.map((x) => ({ value: x.id, label: x.name })))
        setSupplierMap(
          Object.fromEntries(supplierList.map((x) => [x.id, { isIndividual: !!x.isIndividual, address: x.address ?? null }])),
        )
        setIngredients((i.data as { id: string; name: string }[]).map((x) => ({ value: x.id, label: x.name })))
      })
    }
  }, [open, reset])

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitError('')
      // Khi không có hoá đơn: gửi has_invoice=false và bỏ thuế suất từng dòng.
      const payload: FormData = data.has_invoice
        ? {
            ...data,
            purchase_address: undefined,
          }
        : {
            ...data,
            invoice_symbol: undefined,
            invoice_no: undefined,
            invoice_date: undefined,
            items: data.items.map((i) => ({ ...i, vat_rate: undefined })),
          }
      await onSave?.(payload)
      reset()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi tạo phiếu')
    }
  }

  if (!open) return null

  const vatRateOptions = VAT_RATES.map((r) => ({ value: r, label: VAT_RATE_LABELS[r] }))

  return (
    <WinDialog
      title="📄 Tạo Phiếu Nhập Kho"
      open={open}
      onClose={onClose}
      width={hasInvoice ? 880 : 760}
      footer={
        <>
          <span className="text-win-base mr-auto font-semibold">Tổng: {formatCurrency(totals.totalAmount)}</span>
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
      <WinGroupBox title="Thông tin chung">
        <div className="space-y-2">
          <WinSelect
            label="Nhà cung cấp"
            {...register('supplier_id')}
            options={suppliers}
            error={errors.supplier_id?.message}
          />
          <WinInput label="Ghi chú" {...register('note')} />
          <label className="flex items-center gap-2 text-win-base mt-1">
            <input type="checkbox" {...register('paid')} className="w-3 h-3" />
            Đã thanh toán cho NCC
          </label>
          <label className="flex items-center gap-2 text-win-base">
            <input type="checkbox" {...register('has_invoice')} className="w-3 h-3" />
            Có hoá đơn GTGT
          </label>
          {showPurchaseAddress && (
            <WinInput
              label="Địa chỉ mua hàng"
              {...register('purchase_address')}
              placeholder={supplierMap[supplierId]?.address ?? 'Địa chỉ nơi mua (mặc định lấy từ NCC)'}
            />
          )}
        </div>
      </WinGroupBox>

      {hasInvoice && (
        <WinGroupBox title="Hoá đơn">
          <div className="space-y-2">
            <WinInput label="Ký hiệu" {...register('invoice_symbol')} placeholder="VD: 1C25MGT" />
            <WinInput label="Số HĐ" {...register('invoice_no')} error={errors.invoice_no?.message} />
            <WinInput label="Ngày HĐ" type="date" {...register('invoice_date')} error={errors.invoice_date?.message} />
          </div>
        </WinGroupBox>
      )}

      <WinGroupBox title="Chi tiết nguyên liệu">
        <button
          type="button"
          onClick={() => append({ ...DEFAULT_ITEM })}
          className="flex items-center gap-1 text-win-base text-win-active-title hover:underline cursor-pointer mb-2"
        >
          <Plus size={14} /> Thêm dòng
        </button>
        {errors.items?.root && <p className="text-win-xs text-win-error mb-1">{errors.items.root.message}</p>}
        {submitError && <p className="text-win-base text-win-error font-semibold mb-1">⚠️ {submitError}</p>}

        <table className="w-full text-win-base border border-win-grid-border">
          <thead>
            <tr className="bg-win-grid-header">
              <th className="p-1 text-left w-[170px]">Nguyên liệu</th>
              <th className="p-1 w-[60px]">Số lượng</th>
              <th className="p-1 w-[60px]" title="1 ĐVT nhập = ? ĐVT tồn (vd 1 thùng = 24 chai)">
                Hệ số
              </th>
              <th className="p-1 w-[100px]">Đơn giá (ĐVT tồn)</th>
              <th className="p-1 w-[90px]">Thành tiền</th>
              {hasInvoice && <th className="p-1 w-[90px]">Thuế suất</th>}
              {hasInvoice && <th className="p-1 w-[90px]">Tiền thuế</th>}
              <th className="p-1 w-[100px]">HSD</th>
              <th className="p-1 w-[30px]"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, i) => {
              const row = items?.[i] || {}
              const total = lineTotalPrice(row)
              return (
                <tr key={field.id} className="border-t border-win-grid-border">
                  <td className="p-0.5">
                    <select
                      data-testid={`item-${i}-ingredient`}
                      {...register(`items.${i}.ingredient_id`)}
                      className="w-full border border-win-input-border h-8 px-2 text-win-base bg-white"
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
                      data-testid={`item-${i}-quantity`}
                      {...register(`items.${i}.quantity`)}
                      className="w-full border border-win-input-border h-8 px-2 text-win-base text-right bg-white"
                    />
                  </td>
                  <td className="p-0.5">
                    <input
                      type="number"
                      step="0.0001"
                      data-testid={`item-${i}-factor`}
                      {...register(`items.${i}.factor`)}
                      className="w-full border border-win-input-border h-8 px-2 text-win-base text-right bg-white"
                    />
                  </td>
                  <td className="p-0.5">
                    <input
                      type="number"
                      data-testid={`item-${i}-price`}
                      {...register(`items.${i}.unit_price`)}
                      className="w-full border border-win-input-border h-8 px-2 text-win-base text-right bg-white"
                    />
                  </td>
                  <td className="p-0.5 text-right pr-2">{formatNumber(total)}</td>
                  {hasInvoice && (
                    <td className="p-0.5">
                      <select
                        data-testid={`item-${i}-vat-rate`}
                        {...register(`items.${i}.vat_rate`)}
                        className="w-full border border-win-input-border h-8 px-2 text-win-base bg-white"
                      >
                        {vatRateOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {hasInvoice && (
                    <td className="p-0.5 text-right pr-2" data-testid={`item-${i}-vat-amount`}>
                      {formatNumber(computeLineVat(total, (row.vat_rate as never) ?? null))}
                    </td>
                  )}
                  <td className="p-0.5">
                    <input
                      type="date"
                      data-testid={`item-${i}-expiry`}
                      {...register(`items.${i}.expiry_date`)}
                      className="w-full border border-win-input-border h-8 px-2 text-win-base bg-white"
                    />
                  </td>
                  <td className="p-0.5 text-center">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-win-error hover:opacity-70 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="flex flex-col items-end gap-0.5 mt-2 text-win-base">
          <div className="flex gap-4">
            <span className="text-win-text-secondary">Tiền hàng:</span>
            <span className="font-semibold w-32 text-right">{formatNumber(totals.subtotal)}</span>
          </div>
          {hasInvoice && (
            <div className="flex gap-4">
              <span className="text-win-text-secondary">Tiền thuế GTGT:</span>
              <span className="font-semibold w-32 text-right">{formatNumber(totals.vatAmount)}</span>
            </div>
          )}
          <div className="flex gap-4">
            <span className="text-win-text-secondary">Tổng thanh toán:</span>
            <span className="font-bold w-32 text-right">{formatCurrency(totals.totalAmount)}</span>
          </div>
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
