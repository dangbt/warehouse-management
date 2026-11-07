import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { WinDialog, WinGroupBox, WinInput } from '@wms/ui-winforms'
import { useProductAttributes, useProductDetail } from '@/data/use-products'
import { useToastStore } from '@/stores/toast.store'
import { useTerm } from '@/data/use-features'
import { AttributePicker } from './attribute-picker'
import { VariantGrid } from './variant-grid'
import { buildPreview, numOrUndef, toCode } from './variant-matrix'
import type { Axis, VariantRow } from './variant-matrix'
import { saveProduct } from './save-product'

interface Props {
  open: boolean
  /** id SP khi sửa; null = tạo mới */
  productId: string | null
  onClose: () => void
}

const EMPTY = { code: '', name: '', category: '', brand: '', unit: 'cái', basePrice: '', skuTemplate: '' }

export function ProductForm({ open, productId, onClose }: Props) {
  const t = useTerm()
  const { data: attributes = [] } = useProductAttributes(open)
  const { data: detail } = useProductDetail(open ? productId : null)
  const [form, setForm] = useState(EMPTY)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [rows, setRows] = useState<VariantRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Nạp dữ liệu khi mở: tạo mới → form trống; sửa → thông tin SP + các giá trị đang dùng của biến thể đang bán.
  useEffect(() => {
    if (!open) return
    setError('')
    setRows([])
    if (!productId) {
      setForm(EMPTY)
      setSelected({})
    } else if (detail) {
      setForm({
        code: detail.code,
        name: detail.name,
        category: detail.category ?? '',
        brand: detail.brand ?? '',
        unit: detail.unit,
        basePrice: detail.basePrice ?? '',
        skuTemplate: detail.skuTemplate ?? '',
      })
      const sel: Record<string, string[]> = {}
      for (const it of detail.items.filter((i) => i.isActive))
        for (const av of it.attributeValues ?? []) sel[av.attributeId] = [...new Set([...(sel[av.attributeId] ?? []), av.attributeValueId])]
      setSelected(sel)
    }
  }, [open, productId, detail])

  const axes: Axis[] = useMemo(
    () =>
      attributes
        .map((a) => ({
          attributeId: a.id,
          attributeCode: a.code,
          attributeName: a.name,
          values: a.values.filter((v) => selected[a.id]?.includes(v.id)).map((v) => ({ id: v.id, value: v.value, code: v.code })),
        }))
        .filter((a) => a.values.length > 0),
    [attributes, selected],
  )

  useEffect(() => {
    setRows((prev) =>
      buildPreview(
        {
          productCode: toCode(form.code),
          productName: form.name,
          skuTemplate: form.skuTemplate || null,
          axes,
          existing: detail?.items ?? [],
          defaultSale: form.basePrice,
          defaultCost: '',
        },
        prev,
      ),
    )
  }, [axes, form.code, form.name, form.skuTemplate, form.basePrice, detail])

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggle = (attrId: string, valueId: string) =>
    setSelected((s) => {
      const cur = s[attrId] ?? []
      return { ...s, [attrId]: cur.includes(valueId) ? cur.filter((x) => x !== valueId) : [...cur, valueId] }
    })

  const submit = async () => {
    if (!form.code.trim() || !form.name.trim()) return setError('Mã và tên là bắt buộc')
    setSaving(true)
    setError('')
    try {
      const res = await saveProduct({
        productId: productId ?? undefined,
        product: {
          code: form.code,
          name: form.name,
          category: form.category || null,
          brand: form.brand || null,
          unit: form.unit || 'cái',
          base_price: numOrUndef(form.basePrice) ?? null,
          sku_template: form.skuTemplate || null,
        },
        selection: axes.map((a) => ({ attribute_id: a.attributeId, value_ids: a.values.map((v) => v.id) })),
        rows,
      })
      useToastStore.getState().success(`Đã lưu ${t('item_lower')} và ${res.count} biến thể`)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <WinDialog
      title={productId ? t('item_edit') : t('item_add')}
      icon={productId ? <Pencil size={16} strokeWidth={1.75} /> : <Plus size={16} strokeWidth={1.75} />}
      open={open}
      onClose={onClose}
      width={860}
      footer={
        <>
          <button onClick={submit} disabled={saving} className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title min-w-[75px] cursor-pointer disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button onClick={onClose} className="px-4 py-1 text-xs bg-win-button border border-win-button-border min-w-[75px] cursor-pointer hover:bg-win-button-hover">
            Cancel
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <div className="text-win-error text-win-base">{error}</div>}
        <WinGroupBox title="Thông tin chung">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <WinInput label="Mã" value={form.code} onChange={set('code')} disabled={!!productId} />
            <WinInput label="Tên" value={form.name} onChange={set('name')} />
            <WinInput label="Danh mục" value={form.category} onChange={set('category')} />
            <WinInput label="Thương hiệu" value={form.brand} onChange={set('brand')} />
            <WinInput label="ĐVT" value={form.unit} onChange={set('unit')} />
            <WinInput label="Giá bán gốc" type="number" value={form.basePrice} onChange={set('basePrice')} />
            <WinInput label="Mẫu SKU" placeholder="{PRODUCT}-{COLOR}-{SIZE}" value={form.skuTemplate} onChange={set('skuTemplate')} />
          </div>
        </WinGroupBox>
        <WinGroupBox title="Thuộc tính biến thể">
          <AttributePicker attributes={attributes} selected={selected} onToggle={toggle} />
        </WinGroupBox>
        <WinGroupBox title="Xem trước biến thể">
          <VariantGrid rows={rows} axes={axes} onChange={setRows} />
        </WinGroupBox>
      </div>
    </WinDialog>
  )
}
