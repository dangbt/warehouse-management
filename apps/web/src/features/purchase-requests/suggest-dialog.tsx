import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { WinDialog } from '@wms/ui-winforms'
import { api } from '@/services/api'
import { fetchLowStockSuggestion, useCreatePurchaseRequest, type LowStockSuggestion } from '@/data'
import { formatNumber } from '@wms/shared'

interface Row extends LowStockSuggestion {
  checked: boolean
}

const cell = 'h-8 border border-win-input-border px-2 text-[13px] bg-white'

/** Lập đề nghị mua hàng từ danh sách NL tồn thấp (SL/NCC/giá gợi ý, cho sửa trước khi lưu). */
export function SuggestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [factor, setFactor] = useState(2)
  const [rows, setRows] = useState<Row[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const create = useCreatePurchaseRequest()

  const load = (f: number) => {
    setLoading(true)
    fetchLowStockSuggestion(f)
      .then((r) => setRows(r.items.map((i) => ({ ...i, checked: true }))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!open) return
    setNote('')
    load(factor)
    api.get('/suppliers?limit=1000').then((s) => setSuppliers(s.data as { id: string; name: string }[]))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ nạp lại khi mở dialog; đổi hệ số bấm "Tính lại"
  }, [open])

  const patch = (idx: number, p: Partial<Row>) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...p } : r)))
  const picked = rows.filter((r) => r.checked && r.quantity > 0)

  const save = async () => {
    await create.mutateAsync({
      note,
      items: picked.map((r) => ({
        ingredient_id: r.ingredientId,
        quantity: r.quantity,
        buy_unit: r.buyUnit ?? undefined,
        buy_factor: r.buyFactor,
        supplier_id: r.supplierId ?? undefined,
        unit_price: r.unitPrice,
      })),
    })
    onClose()
  }

  return (
    <WinDialog
      title="Lập đề nghị từ tồn thấp"
      icon={<ClipboardList size={16} strokeWidth={1.75} />}
      open={open}
      onClose={onClose}
      width={Math.min(1000, typeof window !== 'undefined' ? window.innerWidth * 0.96 : 1000)}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-5 text-[14px] bg-win-button border border-win-button-border cursor-pointer">
            Huỷ
          </button>
          <button
            type="button"
            disabled={!picked.length || create.isPending}
            onClick={save}
            className="h-9 px-6 text-[14px] font-semibold bg-win-active-title text-white border border-win-active-title cursor-pointer disabled:opacity-50"
          >
            Lập đề nghị ({picked.length} dòng)
          </button>
        </>
      }
    >
      <div className="space-y-3 text-[14px]">
        <div className="flex items-center gap-3">
          <label>Hệ số an toàn</label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={factor}
            onChange={(e) => setFactor(Number(e.target.value))}
            className={`${cell} w-20`}
            data-testid="input-Hệ số an toàn"
          />
          <button type="button" onClick={() => load(factor)} className="h-8 px-3 bg-win-button border border-win-button-border cursor-pointer">
            Tính lại
          </button>
          <span className="text-win-text-secondary text-[12px]">SL gợi ý = tồn tối thiểu × hệ số − tồn hiện tại, làm tròn lên theo ĐVT mua</span>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Diễn giải" className={`${cell} w-full`} />
        <table className="w-full border border-win-grid-border bg-white">
          <thead>
            <tr className="bg-win-grid-header">
              <th className="p-1.5 w-8" />
              <th className="p-1.5 text-left">Nguyên liệu</th>
              <th className="p-1.5 text-right">Tồn / Tối thiểu</th>
              <th className="p-1.5 text-right w-28">SL đặt</th>
              <th className="p-1.5 text-left w-48">NCC</th>
              <th className="p-1.5 text-right w-28">Đơn giá</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.ingredientId} className="border-t border-win-grid-border">
                <td className="p-1.5 text-center">
                  <input type="checkbox" checked={r.checked} onChange={(e) => patch(idx, { checked: e.target.checked })} />
                </td>
                <td className="p-1.5">
                  {r.name} <span className="text-win-text-secondary">({r.unit}{r.buyUnit ? `, mua theo ${r.buyUnit}` : ''})</span>
                </td>
                <td className="p-1.5 text-right">
                  {formatNumber(r.currentStock)} / {formatNumber(r.minStock)}
                </td>
                <td className="p-1.5">
                  <input type="number" min={0} value={r.quantity} onChange={(e) => patch(idx, { quantity: Number(e.target.value) })} className={`${cell} w-full text-right`} />
                </td>
                <td className="p-1.5">
                  <select value={r.supplierId ?? ''} onChange={(e) => patch(idx, { supplierId: e.target.value || null })} className={`${cell} w-full`}>
                    <option value="">-- Chọn NCC --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1.5">
                  <input type="number" min={0} value={r.unitPrice} onChange={(e) => patch(idx, { unitPrice: Number(e.target.value) })} className={`${cell} w-full text-right`} />
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-win-text-secondary">
                  {loading ? 'Đang tính...' : 'Không có nguyên liệu nào dưới mức tồn tối thiểu'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </WinDialog>
  )
}
