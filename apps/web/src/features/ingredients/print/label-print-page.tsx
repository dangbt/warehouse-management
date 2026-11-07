import { useState } from 'react'
import { PrintLayout } from '@/components/print/print-layout'
import { BarcodeSvg } from '@/components/barcode/barcode-svg'
import { useIngredients } from '@/data'
import { buildLabels, LABEL_SIZES, paginate, type LabelData, type LabelSize, type LabelSource } from './label-layout'

function Label({ data, size }: { data: LabelData; size: LabelSize }) {
  const { w, h } = LABEL_SIZES[size]
  return (
    <div className="label-cell" style={{ width: `${w}mm`, height: `${h}mm` }} data-testid="label">
      <div className="label-name">{data.name}</div>
      <BarcodeSvg value={data.code} height={40} className="label-bars" />
      <div className="label-foot">
        <span>{data.code}</span>
        <span>ĐVT: {data.unit}</span>
      </div>
    </div>
  )
}

/** In tem mã vạch cho 1..n hàng: chọn khổ decal 40×30 hoặc A4 nhiều tem và số tem mỗi hàng. */
export function LabelPrintPage({ id }: { id: string }) {
  const [size, setSize] = useState<LabelSize>('decal')
  const [copies, setCopies] = useState(1)
  const ids = id.split(',').filter(Boolean)
  const { data: res, isLoading, error } = useIngredients({ limit: 1000 })

  const spec = LABEL_SIZES[size]
  const items = ((res?.data ?? []) as LabelSource[]).filter((i) => ids.includes(i.id))
  const { labels, missing } = buildLabels(items, copies)
  const pages = paginate(labels, spec.perPage)

  const toolbar = (
    <>
      <label>
        Khổ tem:{' '}
        <select data-testid="label-size" value={size} onChange={(e) => setSize(e.target.value as LabelSize)}>
          {Object.entries(LABEL_SIZES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Số tem/hàng:{' '}
        <input data-testid="label-copies" type="number" min={1} max={500} value={copies} onChange={(e) => setCopies(Number(e.target.value))} style={{ width: 60 }} />
      </label>
      <button type="button" data-testid="print-button" disabled={labels.length === 0} onClick={() => window.print()}>
        In
      </button>
    </>
  )

  return (
    <PrintLayout bare toolbar={toolbar}>
      <style>{`@page { size: ${spec.page}; margin: 0; }`}</style>
      {isLoading && <div className="p-4">Đang tải...</div>}
      {error && <div className="p-4">Không tải được dữ liệu hàng.</div>}
      {missing.length > 0 && (
        <div className="no-print print-config-warning" data-testid="label-missing">
          Chưa có mã vạch/SKU nên bỏ qua: {missing.join(', ')}. Vào form sửa → bấm "Sinh mã".
        </div>
      )}
      {pages.map((page, i) => (
        <section key={i} className={`label-page label-page-${size}`}>
          {page.map((l) => (
            <Label key={l.key} data={l} size={size} />
          ))}
        </section>
      ))}
    </PrintLayout>
  )
}
