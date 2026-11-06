import { FileText, TriangleAlert } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { VoucherFields } from '@/components/voucher-fields'
import { useVoucherFields } from '@/data/use-vouchers'
import type { VoucherPayload } from '@/data/use-vouchers'
import { WinDialog } from '@wms/ui-winforms'
import { api } from '@/services/api'
import { formatCurrency, formatNumber } from '@wms/shared'
import { computeVatTotals } from './vat'
import { orderToFormValues, orderIngredientOptions, localDay, type EditableImportOrder } from './import-order-edit'
import { ImportOrderItemsTable, type IngredientOption } from './import-order-items-table'

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

/** Dữ liệu điền sẵn khi lập phiếu nhập từ đơn mua hàng (PO). */
export interface ImportOrderInitial {
  supplierId: string
  note?: string
  items: { ingredientId: string; quantity: number; unitPrice: number }[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSave?: (data: FormData & VoucherPayload) => void
  initial?: ImportOrderInitial
  /** Có phiếu ⇒ chế độ sửa (phiếu PENDING): nạp sẵn dữ liệu, lưu = cập nhật. */
  order?: EditableImportOrder | null
}

interface SupplierInfo {
  isIndividual: boolean
  address: string | null
  taxCode: string | null
  phone: string | null
}

const DEFAULT_ITEM = { ingredient_id: '', quantity: 0, factor: 1, unit_price: 0, vat_rate: '8', expiry_date: '' }

const EMPTY_FORM: FormData = {
  supplier_id: '',
  note: '',
  paid: false,
  has_invoice: false,
  invoice_symbol: '',
  invoice_no: '',
  invoice_date: '',
  purchase_address: '',
  items: [{ ...DEFAULT_ITEM }],
}

function initialToForm(init: ImportOrderInitial): FormData {
  return {
    ...EMPTY_FORM,
    supplier_id: init.supplierId,
    note: init.note ?? '',
    items: init.items.map((i) => ({ ...DEFAULT_ITEM, ingredient_id: i.ingredientId, quantity: i.quantity, unit_price: i.unitPrice })),
  }
}

const input = 'w-full h-10 border px-3 text-[14px] bg-white outline-none focus:border-win-input-focus disabled:bg-win-control'

/** Một dòng "nhãn: ô nhập" cỡ lớn, nhãn bên trái như chứng từ MISA. */
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <label className="w-[120px] shrink-0 pt-2.5 text-[14px] text-right">
        {label}
        {required && <span className="text-win-error"> *</span>}
      </label>
      <div className="flex-1 min-w-0">
        {children}
        {error && <p className="text-[12px] text-win-error mt-0.5">{error}</p>}
      </div>
    </div>
  )
}

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="border border-win-grid-border bg-white">
      <header className="flex items-center gap-2 px-3 h-10 border-b border-win-grid-border bg-win-grid-header">
        <span className="w-6 h-6 rounded-full bg-win-active-title text-white text-[13px] font-semibold flex items-center justify-center">
          {step}
        </span>
        <span className="text-[15px] font-semibold">{title}</span>
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}

/**
 * Phiếu nhập kho — bố cục theo luồng nhập hàng kiểu MISA:
 * ① Nhà cung cấp → ② Chứng từ (hoá đơn, thanh toán) → ③ Hàng tiền → Tổng cộng → Lưu.
 */
export function ImportOrderForm({ open, onClose, onSave, initial, order }: Props) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_FORM,
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const hasInvoice = watch('has_invoice')
  const paid = watch('paid')
  const supplierId = watch('supplier_id')
  const totals = computeVatTotals(items ?? [], hasInvoice)

  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([])
  const [supplierMap, setSupplierMap] = useState<Record<string, SupplierInfo>>({})
  const [ingredients, setIngredients] = useState<IngredientOption[]>([])
  const [unitMap, setUnitMap] = useState<Record<string, string>>({})
  const [ingLoading, setIngLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const initialVoucher = useMemo(() => (order ? { date: localDay(order.voucherDate), no: order.voucherNo } : null), [order])
  const voucher = useVoucherFields('IMPORT', open, initialVoucher)

  // Tìm NL phía server (giống develop): giới hạn kết quả, cộng dồn ĐVT để cột ĐVT không mất khi đổi từ khoá.
  const fetchIngredients = useCallback((q: string) => {
    setIngLoading(true)
    api
      .get(`/ingredients?limit=20&search=${encodeURIComponent(q)}`)
      .then((res) => {
        const list = res.data as { id: string; name: string; unit: string }[]
        const found = list.map((x) => ({ value: x.id, label: x.name, unit: x.unit }))
        const extra = orderIngredientOptions(order).filter((e) => !found.some((f) => f.value === e.value))
        setIngredients([...extra, ...found])
        setUnitMap((m) => ({ ...m, ...Object.fromEntries([...extra, ...found].map((x) => [x.value, x.unit])) }))
      })
      .finally(() => setIngLoading(false))
  }, [order])

  const supplier = supplierId ? supplierMap[supplierId] : undefined
  // Người bán cá nhân không có hoá đơn ⇒ hiện field "Địa chỉ mua hàng".
  const showPurchaseAddress = !hasInvoice && !!supplier?.isIndividual

  useEffect(() => {
    if (!open) return
    reset(order ? orderToFormValues(order) : initial ? initialToForm(initial) : EMPTY_FORM)
    setSubmitError('')
    api.get('/suppliers?limit=1000').then((s) => {
      const supplierList = s.data as {
        id: string
        name: string
        isIndividual?: boolean
        address?: string | null
        taxCode?: string | null
        phone?: string | null
      }[]
      setSuppliers(supplierList.map((x) => ({ value: x.id, label: x.name })))
      // Select NCC cần có option trước khi nhận giá trị ⇒ nạp lại dữ liệu sửa sau khi tải danh sách.
      if (order) reset(initial)
      setSupplierMap(
        Object.fromEntries(
          supplierList.map((x) => [
            x.id,
            { isIndividual: !!x.isIndividual, address: x.address ?? null, taxCode: x.taxCode ?? null, phone: x.phone ?? null },
          ]),
        ),
      )
    })
    fetchIngredients('')
    if (initial?.items.length) {
      // Nạp tên NL của các dòng điền sẵn để ô chọn NL hiển thị đúng.
      void api.get(`/ingredients?limit=100`).then((res) => {
        const list = res.data as { id: string; name: string; unit: string }[]
        const ids = new Set(initial.items.map((i) => i.ingredientId))
        const picked = list.filter((x) => ids.has(x.id))
        setIngredients((cur) => [...picked.map((x) => ({ value: x.id, label: x.name, unit: x.unit })), ...cur.filter((c) => !ids.has(c.value))])
        setUnitMap((m) => ({ ...m, ...Object.fromEntries(picked.map((x) => [x.id, x.unit])) }))
      })
    }
    setTimeout(() => setFocus('supplier_id'), 0)
  }, [open, order, reset, setFocus, fetchIngredients, initial])

  const addRow = useCallback(() => {
    append({ ...DEFAULT_ITEM })
    setTimeout(() => setFocus(`items.${fields.length}.quantity`), 0)
  }, [append, setFocus, fields.length])

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitError('')
      // Khi không có hoá đơn: gửi has_invoice=false và bỏ thuế suất từng dòng.
      const payload: FormData = data.has_invoice
        ? { ...data, purchase_address: undefined }
        : {
            ...data,
            invoice_symbol: undefined,
            invoice_no: undefined,
            invoice_date: undefined,
            items: data.items.map((i) => ({ ...i, vat_rate: undefined })),
          }
      await onSave?.({ ...payload, ...voucher.payload() })
      reset()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi tạo phiếu')
    }
  }

  // Phím tắt: Ctrl/Cmd+S lưu, Esc đóng.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!open) return null

  const border = (err?: unknown) => (err ? 'border-win-error' : 'border-win-input-border')

  return (
    <WinDialog
      title={order ? `Sửa Phiếu Nhập Kho ${order.voucherNo}` : 'Tạo Phiếu Nhập Kho'}
      icon={<FileText size={16} strokeWidth={1.75} />}
      open={open}
      onClose={onClose}
      width={Math.min(1180, typeof window !== 'undefined' ? window.innerWidth * 0.96 : 1180)}
      footer={
        <>
          <span className="text-[16px] font-bold">Tổng: {formatCurrency(totals.totalAmount)}</span>
          <span className="mr-auto ml-4 text-[12px] text-win-text-secondary">Ctrl+S: Lưu · Esc: Đóng</span>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 text-[14px] bg-win-button border border-win-button-border min-w-[100px] cursor-pointer hover:bg-win-button-hover"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="h-10 px-6 text-[14px] font-semibold bg-win-active-title text-white border border-win-active-title min-w-[120px] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {submitError && (
          <div className="px-3 py-2 border border-win-error bg-red-50 text-[14px] text-win-error font-semibold">
            <TriangleAlert size={14} strokeWidth={2} className="inline -mt-0.5 mr-1" />
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3">
          <Section step={1} title="Nhà cung cấp">
            <div className="space-y-2.5">
              <Field label="Ngày chứng từ">
                <input
                  data-testid="input-Ngày chứng từ"
                  type="date"
                  value={voucher.date}
                  onChange={(e) => voucher.setDate(e.target.value)}
                  className={`${input} ${border()}`}
                />
              </Field>
              <Field label="Số chứng từ">
                <input
                  data-testid="input-Số chứng từ"
                  value={voucher.no}
                  onChange={(e) => voucher.setNo(e.target.value)}
                  placeholder="Tự động"
                  className={`${input} ${border()}`}
                />
              </Field>
              <Field label="Nhà cung cấp" required error={errors.supplier_id?.message}>
                <select data-testid="select-Nhà cung cấp" {...register('supplier_id')} className={`${input} ${border(errors.supplier_id)}`}>
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              {supplier && (
                <div className="ml-[132px] text-[13px] text-win-text-secondary space-y-0.5">
                  {supplier.taxCode && <div>MST: {supplier.taxCode}</div>}
                  {supplier.address && <div>Địa chỉ: {supplier.address}</div>}
                  {supplier.phone && <div>ĐT: {supplier.phone}</div>}
                  {supplier.isIndividual && <div className="italic">Người bán cá nhân / hộ không có hoá đơn</div>}
                </div>
              )}
              {showPurchaseAddress && (
                <Field label="Địa chỉ mua hàng">
                  <input
                    data-testid="input-Địa chỉ mua hàng"
                    {...register('purchase_address')}
                    placeholder={supplier?.address ?? 'Địa chỉ nơi mua (mặc định lấy từ NCC)'}
                    className={`${input} ${border()}`}
                  />
                </Field>
              )}
              <Field label="Diễn giải">
                <input
                  data-testid="input-Ghi chú"
                  {...register('note')}
                  placeholder="VD: Nhập rau củ sáng 06/11"
                  className={`${input} ${border()}`}
                />
              </Field>
            </div>
          </Section>

          <Section step={2} title="Chứng từ">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 h-10 text-[14px] cursor-pointer select-none">
                <input type="checkbox" {...register('has_invoice')} className="w-4 h-4" />
                Có hoá đơn GTGT
              </label>
              {hasInvoice && (
                <>
                  <Field label="Ký hiệu">
                    <input
                      data-testid="input-Ký hiệu"
                      {...register('invoice_symbol')}
                      placeholder="VD: 1C25MGT"
                      className={`${input} ${border()}`}
                    />
                  </Field>
                  <Field label="Số HĐ" required error={errors.invoice_no?.message}>
                    <input data-testid="input-Số HĐ" {...register('invoice_no')} className={`${input} ${border(errors.invoice_no)}`} />
                  </Field>
                  <Field label="Ngày HĐ" required error={errors.invoice_date?.message}>
                    <input
                      type="date"
                      data-testid="input-Ngày HĐ"
                      {...register('invoice_date')}
                      className={`${input} ${border(errors.invoice_date)}`}
                    />
                  </Field>
                </>
              )}
              <label className="flex items-center gap-2 h-10 text-[14px] cursor-pointer select-none border-t border-win-grid-border pt-2">
                <input type="checkbox" {...register('paid')} className="w-4 h-4" />
                Đã thanh toán cho NCC
                <span
                  className={`ml-auto text-[12px] px-2 py-0.5 rounded ${paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                >
                  {paid ? 'Đã trả tiền' : 'Ghi công nợ'}
                </span>
              </label>
            </div>
          </Section>
        </div>

        <Section step={3} title="Hàng tiền">
          <ImportOrderItemsTable
            register={register}
            control={control}
            fields={fields}
            rows={items ?? []}
            ingredients={ingredients}
            unitMap={unitMap}
            onSearchIngredients={fetchIngredients}
            ingredientsLoading={ingLoading}
            hasInvoice={hasInvoice}
            onAdd={addRow}
            onRemove={remove}
            rootError={errors.items?.root?.message ?? errors.items?.message}
          />

          <div className="flex justify-end mt-3">
            <div className="w-full max-w-[360px] border border-win-grid-border text-[14px]">
              <div className="flex justify-between px-3 py-2">
                <span className="text-win-text-secondary">Tiền hàng</span>
                <span className="font-semibold">{formatNumber(totals.subtotal)}</span>
              </div>
              {hasInvoice && (
                <div className="flex justify-between px-3 py-2 border-t border-win-grid-border">
                  <span className="text-win-text-secondary">Tiền thuế GTGT</span>
                  <span className="font-semibold">{formatNumber(totals.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-3 py-2.5 border-t border-win-grid-border bg-win-grid-header">
                <span className="font-semibold">Tổng thanh toán</span>
                <span className="text-[18px] font-bold text-win-active-title">{formatCurrency(totals.totalAmount)}</span>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </WinDialog>
  )
}
