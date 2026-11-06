import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Grid3x3 } from 'lucide-react'
import { WinDialog } from '@wms/ui-winforms'
import { formatNumber } from '@wms/shared'
import { fetchProduct, useProductAttributes, useProducts, type ProductDetail } from '@/data/use-products'
import { buildMatrixModel, cellKey, collectLines, colTotal, rowTotal, type MatrixLine, type MatrixMode } from './matrix-logic'

interface Props {
  open: boolean
  mode: MatrixMode
  onClose: () => void
  onConfirm: (lines: MatrixLine[]) => void
}

const input = 'h-9 w-full border border-win-input-border px-2 text-[14px] text-right bg-white outline-none focus:border-win-input-focus'
const TITLES: Record<MatrixMode, string> = {
  import: 'Thêm theo sản phẩm — nhập kho',
  export: 'Thêm theo sản phẩm — xuất kho',
  stocktake: 'Nhập số kiểm đếm theo sản phẩm',
  return: 'Thêm theo sản phẩm — trả hàng',
}

/** Popup lưới ma trận màu × size: nhập số lượng nhiều biến thể của 1 sản phẩm một lần. */
export function MatrixPicker({ open, mode, onClose, onConfirm }: Props) {
  const showPrice = mode === 'import' || mode === 'return'
  const showStock = mode === 'export' || mode === 'stocktake'
  const { data: list } = useProducts({ limit: 100 })
  const { data: attrs = [] } = useProductAttributes(open)
  const [productId, setProductId] = useState('')
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [qty, setQty] = useState<Record<string, string>>({})
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [shared, setShared] = useState('')
  const [perVariant, setPerVariant] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setProductId('')
      setProduct(null)
      setQty({})
      setPrices({})
      setErrors({})
      setPerVariant(false)
    }
  }, [open])

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    fetchProduct(productId).then((p) => {
      if (cancelled) return
      setProduct(p)
      setQty({})
      setPrices({})
      setErrors({})
      const cost = Number(p.items.find((i) => i.isActive)?.costPerUnit) || 0
      setShared(cost ? String(cost) : '')
    })
    return () => {
      cancelled = true
    }
  }, [productId])

  const model = useMemo(() => (product ? buildMatrixModel(product, attrs) : null), [product, attrs])

  const confirm = () => {
    if (!product || !model) return
    const res = collectLines({ model, productName: product.name, mode, qty, prices, sharedPrice: Number(shared) || 0 })
    setErrors(res.errors)
    if (Object.keys(res.errors).length > 0 || res.lines.length === 0) return
    onConfirm(res.lines)
    onClose()
  }

  /** Enter = sang ô kế tiếp (như Tab); Enter ở ô cuối = xác nhận. */
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const els = Array.from(gridRef.current?.querySelectorAll<HTMLInputElement>('input[data-matrix-cell]') ?? [])
    const next = els[els.indexOf(e.currentTarget) + 1]
    if (next) next.focus()
    else confirm()
  }

  const setCell = (id: string, v: string) => {
    setQty((q) => ({ ...q, [id]: v }))
    setErrors((er) => (er[id] ? { ...er, [id]: '' } : er))
  }

  const grid = (kind: 'qty' | 'price') =>
    model && (
      <table className="border-collapse text-[14px]" data-testid={`matrix-grid-${kind}`}>
        <thead>
          <tr className="bg-win-grid-header">
            <th className="p-2 border border-win-grid-border text-left">Màu \ Size</th>
            {model.cols.map((c) => (
              <th key={c.id} className="p-2 border border-win-grid-border min-w-[84px]">{c.label}</th>
            ))}
            {kind === 'qty' && <th className="p-2 border border-win-grid-border">Tổng</th>}
          </tr>
        </thead>
        <tbody>
          {model.rows.map((r) => (
            <tr key={r.id}>
              <th className="p-2 border border-win-grid-border text-left bg-win-grid-header">{r.label || '—'}</th>
              {model.cols.map((c) => {
                const v = model.cells[cellKey(r.id, c.id)]
                if (!v) return <td key={c.id} className="border border-win-grid-border bg-gray-100" />
                const err = errors[v.itemId]
                return (
                  <td key={c.id} className="p-1 border border-win-grid-border align-top">
                    <input
                      type="number"
                      min={0}
                      inputMode="decimal"
                      data-matrix-cell
                      data-testid={`matrix-${kind}-${r.label || r.id}-${c.label || c.id}`}
                      aria-label={`${kind === 'qty' ? 'Số lượng' : 'Đơn giá'} ${r.label} ${c.label}`}
                      value={kind === 'qty' ? (qty[v.itemId] ?? '') : (prices[v.itemId] ?? '')}
                      placeholder={kind === 'price' ? shared : ''}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={onKey}
                      onChange={(e) => (kind === 'qty' ? setCell(v.itemId, e.target.value) : setPrices((p) => ({ ...p, [v.itemId]: e.target.value })))}
                      className={`${input} ${err ? 'border-win-error' : ''}`}
                    />
                    {kind === 'qty' && showStock && <div className="text-[11px] text-win-text-secondary text-right opacity-60">tồn {formatNumber(v.stock)}</div>}
                    {kind === 'qty' && err && <div className="text-[11px] text-win-error text-right">{err}</div>}
                  </td>
                )
              })}
              {kind === 'qty' && <td className="p-2 border border-win-grid-border text-right font-semibold">{formatNumber(rowTotal(model, r.id, qty))}</td>}
            </tr>
          ))}
        </tbody>
        {kind === 'qty' && (
          <tfoot>
            <tr className="bg-win-grid-header font-semibold">
              <th className="p-2 border border-win-grid-border text-left">Tổng</th>
              {model.cols.map((c) => (
                <td key={c.id} className="p-2 border border-win-grid-border text-right">{formatNumber(colTotal(model, c.id, qty))}</td>
              ))}
              <td data-testid="matrix-total" className="p-2 border border-win-grid-border text-right">
                {formatNumber(model.rows.reduce((s, r) => s + rowTotal(model, r.id, qty), 0))}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    )

  return (
    <WinDialog
      title={TITLES[mode]}
      icon={<Grid3x3 size={16} strokeWidth={1.75} />}
      open={open}
      onClose={onClose}
      width={Math.min(860, typeof window !== 'undefined' ? window.innerWidth * 0.96 : 860)}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-4 text-[14px] bg-win-button border border-win-button-border cursor-pointer hover:bg-win-button-hover">
            Huỷ
          </button>
          <button
            type="button"
            data-testid="matrix-confirm"
            onClick={confirm}
            disabled={!model}
            className="h-9 px-5 text-[14px] font-semibold bg-win-active-title text-white border border-win-active-title cursor-pointer disabled:opacity-50"
          >
            Xác nhận
          </button>
        </>
      }
    >
      <div className="space-y-3" ref={gridRef}>
        <div className="flex items-center gap-3">
          <label className="text-[14px] w-[90px]" htmlFor="matrix-product">Sản phẩm</label>
          <select
            id="matrix-product"
            data-testid="matrix-product"
            autoFocus
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="h-9 flex-1 border border-win-input-border px-2 text-[14px] bg-white"
          >
            <option value="">-- Chọn sản phẩm --</option>
            {list?.data.map((p) => (
              <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
            ))}
          </select>
        </div>
        {showPrice && model && (
          <div className="flex items-center gap-3">
            <label className="text-[14px] w-[90px]" htmlFor="matrix-price">Đơn giá chung</label>
            <input
              id="matrix-price"
              type="number"
              data-testid="matrix-shared-price"
              value={shared}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setShared(e.target.value)}
              className={`${input} !w-[140px]`}
            />
            <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
              <input type="checkbox" checked={perVariant} onChange={(e) => setPerVariant(e.target.checked)} /> Sửa giá riêng từng biến thể
            </label>
          </div>
        )}
        {model && <div className="overflow-x-auto">{grid('qty')}</div>}
        {showPrice && perVariant && model && (
          <div className="overflow-x-auto">
            <div className="text-[13px] text-win-text-secondary mb-1">Đơn giá riêng (để trống = dùng giá chung)</div>
            {grid('price')}
          </div>
        )}
        {model && <p className="text-[12px] text-win-text-secondary">Tab / Enter: sang ô kế tiếp · Enter ở ô cuối: xác nhận · ô trống hoặc 0 sẽ bị bỏ qua</p>}
      </div>
    </WinDialog>
  )
}
