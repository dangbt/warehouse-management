import { useCallback, useEffect, useState } from 'react'
import { ArrowRightLeft, TriangleAlert } from 'lucide-react'
import { WinDialog, WinGroupBox, WinInput, WinSearchSelect } from '@wms/ui-winforms'
import { api } from '@/services/api'
import { itemLabel } from '@/utils/item-label'
import { useTerm } from '@/data/use-features'
import { useVoucherFields } from '@/data/use-vouchers'
import { useWarehouseChoice } from '@/hooks/use-warehouse-choice'
import { VoucherFields } from '@/components/voucher-fields'
import { WarehouseSelect } from '@/components/warehouse-select'
import type { StockTransferInput } from '@/data'

interface Line {
  ingredientId: string
  label: string
  quantity: number
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: StockTransferInput) => Promise<unknown>
}

/** Form phiếu chuyển kho: kho nguồn, kho đích, ngày/số CT và danh sách dòng (mã hàng + SL). */
export function StockTransferForm({ open, onClose, onSave }: Props) {
  const t = useTerm()
  const voucher = useVoucherFields('TRANSFER', open)
  const from = useWarehouseChoice()
  const [toId, setToId] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])
  const [pickId, setPickId] = useState('')
  const [pickQty, setPickQty] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const toOptions = from.warehouses.filter((w) => w.id !== from.warehouseId)
  const effectiveTo = toOptions.some((w) => w.id === toId) ? toId : (toOptions[0]?.id ?? '')

  const search = useCallback(
    (q: string) => {
      api
        .get(`/ingredients?limit=10&search=${encodeURIComponent(q)}${from.warehouseId ? `&warehouse_id=${from.warehouseId}` : ''}`)
        .then((res) => {
          const list = res.data as { id: string; name: string; sku?: string | null; currentStock: string; unit: string }[]
          setOptions(list.map((i) => ({ value: i.id, label: `${itemLabel(i)} (tồn: ${i.currentStock} ${i.unit})` })))
        })
        .catch(() => setOptions([]))
    },
    [from.warehouseId],
  )

  useEffect(() => {
    if (!open) return
    setLines([])
    setNote('')
    setError('')
    setPickId('')
    setPickQty('')
  }, [open])

  useEffect(() => {
    if (open) search('')
  }, [open, search])

  const addLine = () => {
    const qty = Number(pickQty)
    if (!pickId || !(qty > 0)) return setError(`Chọn ${t('item_lower')} và nhập số lượng > 0`)
    setError('')
    const label = options.find((o) => o.value === pickId)?.label ?? pickId
    setLines((cur) => {
      const same = cur.find((l) => l.ingredientId === pickId)
      return same ? cur.map((l) => (l === same ? { ...l, quantity: l.quantity + qty } : l)) : [...cur, { ingredientId: pickId, label, quantity: qty }]
    })
    setPickId('')
    setPickQty('')
  }

  const submit = async () => {
    if (!from.warehouseId || !effectiveTo) return setError('Cần ít nhất 2 kho để chuyển kho')
    if (lines.length === 0) return setError('Thêm ít nhất một dòng')
    setSaving(true)
    try {
      setError('')
      await onSave({
        ...voucher.payload(),
        from_warehouse_id: from.warehouseId,
        to_warehouse_id: effectiveTo,
        note: note || undefined,
        items: lines.map((l) => ({ ingredient_id: l.ingredientId, quantity: l.quantity })),
      })
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi tạo phiếu chuyển kho')
    } finally {
      setSaving(false)
    }
  }

  return (
    <WinDialog
      title="Chuyển Kho"
      icon={<ArrowRightLeft size={16} strokeWidth={1.75} />}
      open={open}
      onClose={onClose}
      width={520}
      footer={
        <>
          <button onClick={() => void submit()} disabled={saving} className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title min-w-[75px] cursor-pointer disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button onClick={onClose} className="px-4 py-1 text-xs bg-win-button border border-win-button-border min-w-[75px] cursor-pointer hover:bg-win-button-hover">
            Huỷ
          </button>
        </>
      }
    >
      <WinGroupBox title="Thông tin chuyển kho">
        <div className="space-y-2.5">
          <VoucherFields {...voucher} />
          <WarehouseSelect label="Kho nguồn" value={from.warehouseId} onChange={from.setWarehouseId} testId="transfer-from" />
          <WarehouseSelect label="Kho đích" value={effectiveTo} onChange={setToId} testId="transfer-to" />
          {!from.multi && <p className="text-win-base text-win-error">Cần ít nhất 2 kho hoạt động để chuyển kho.</p>}
          <WinInput label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
          <WinSearchSelect label={t('item')} name="transfer-item" value={pickId} onChange={(v: string) => setPickId(v)} options={options} onSearch={search} />
          <WinInput label="Số lượng" type="number" step="0.01" value={pickQty} onChange={(e) => setPickQty(e.target.value)} />
          <button type="button" onClick={addLine} data-testid="transfer-add-line" className="px-3 py-1 text-xs bg-win-button border border-win-button-border cursor-pointer hover:bg-win-button-hover">
            Thêm dòng
          </button>
          {lines.length > 0 && (
            <table data-testid="transfer-lines" className="w-full text-win-base border border-win-grid-border">
              <tbody>
                {lines.map((l) => (
                  <tr key={l.ingredientId} className="border-b border-win-grid-border">
                    <td className="p-1">{l.label}</td>
                    <td className="p-1 text-right w-16">{l.quantity}</td>
                    <td className="p-1 w-8">
                      <button type="button" title="Xoá dòng" onClick={() => setLines((cur) => cur.filter((x) => x !== l))} className="text-win-error cursor-pointer">
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {error && (
            <p className="text-win-base text-win-error font-semibold">
              <TriangleAlert size={14} strokeWidth={2} className="inline -mt-0.5 mr-1" />
              {error}
            </p>
          )}
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
