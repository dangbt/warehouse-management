import { PrintLayout } from '@/components/print/print-layout'
import { SignatureBlock } from '@/components/print/signature-block'
import { PrintToolbarButton, dateLine, isOrgReady, useAutoPrint } from '@/components/print/print-utils'
import { usePrintHeader, useStocktakeDetail } from '@/data'
import { formatNumber } from '@wms/shared'

const WAREHOUSE_NAME = 'Kho nguyên liệu'
const STOCKTAKE_SIGNATURES = ['Thủ kho', 'Kế toán', 'Trưởng ban kiểm kê', 'Kế toán trưởng', 'Giám đốc'] as const

interface Row {
  id: string
  name: string
  unit: string
  cost: number
  bookQty: number
  actualQty: number
  diff: number
  note: string
}

const round = (n: number) => Math.round(n)

/** Biên bản kiểm kê vật tư, công cụ, sản phẩm, hàng hóa mẫu 05-VT, in A4. */
export function StocktakePrintPage({ id }: { id: string }) {
  const { data: detail, isLoading, error } = useStocktakeDetail(id)
  const { data: org, isLoading: orgLoading, error: orgError } = usePrintHeader()
  useAutoPrint(!!detail && isOrgReady(org))

  if (isLoading || orgLoading) return <div className="p-4">Đang tải...</div>
  if (error || !detail) return <div className="p-4">Không tải được phiên kiểm kê.</div>
  if (orgError) return <div className="p-4" data-testid="print-header-error">Không tải được thông tin đơn vị để in. Vui lòng thử lại.</div>

  const rows: Row[] = detail.items.map((i) => {
    const bookQty = Number(i.systemQty)
    const actualQty = i.actualQty != null ? Number(i.actualQty) : bookQty
    return {
      id: i.id,
      name: i.ingredient.name,
      unit: i.ingredient.unit,
      cost: Number(i.ingredient.costPerUnit ?? 0),
      bookQty,
      actualQty,
      diff: actualQty - bookQty,
      note: i.note ?? '',
    }
  })
  const sum = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0)
  const book = sum((r) => round(r.bookQty * r.cost))
  const actual = sum((r) => round(r.actualQty * r.cost))
  const surplus = sum((r) => (r.diff > 0 ? round(r.diff * r.cost) : 0))
  const shortage = sum((r) => (r.diff < 0 ? round(-r.diff * r.cost) : 0))
  const date = detail.voucherDate ?? detail.completedAt ?? detail.createdAt
  const q = (n: number) => (n ? formatNumber(n) : '')

  return (
    <PrintLayout
      org={org}
      formNote={
        <>
          <strong>Mẫu số 05 - VT</strong>
          <div>(Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính)</div>
        </>
      }
      toolbar={<PrintToolbarButton />}
    >
      <h1 className="print-title">Biên bản kiểm kê vật tư, công cụ, sản phẩm, hàng hóa</h1>
      <div className="print-subtitle">Thời điểm kiểm kê: {dateLine(date)}</div>
      <div className="print-meta">
        <div>Số: <strong>{detail.voucherNo ?? detail.code}</strong></div>
        <div>Ban kiểm kê gồm:</div>
        <div>- Ông/Bà: {detail.createdBy?.fullName ?? '……………………'} &nbsp; Chức vụ: ………………… &nbsp; Đại diện: ………………</div>
        <div>- Ông/Bà: …………………………… &nbsp; Chức vụ: ………………… &nbsp; Đại diện: ………………</div>
        <div>Đã kiểm kê kho có những mặt hàng sau: {WAREHOUSE_NAME}</div>
      </div>
      <table className="print-table print-table-dense">
        <thead>
          <tr>
            <th rowSpan={3} style={{ width: 24 }}>STT</th>
            <th rowSpan={3}>Tên, nhãn hiệu, quy cách vật tư, dụng cụ, sản phẩm, hàng hóa</th>
            <th rowSpan={3} style={{ width: 36 }}>Mã số</th>
            <th rowSpan={3} style={{ width: 34 }}>ĐVT</th>
            <th rowSpan={3} style={{ width: 52 }}>Đơn giá</th>
            <th colSpan={2} rowSpan={2}>Theo sổ kế toán</th>
            <th colSpan={2} rowSpan={2}>Theo kiểm kê</th>
            <th colSpan={4}>Chênh lệch</th>
            <th rowSpan={3} style={{ width: 50 }}>Ghi chú</th>
          </tr>
          <tr>
            <th colSpan={2}>Thừa</th>
            <th colSpan={2}>Thiếu</th>
          </tr>
          <tr>
            {['SL', 'Thành tiền', 'SL', 'Thành tiền', 'SL', 'Thành tiền', 'SL', 'Thành tiền'].map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id}>
              <td className="ctr">{idx + 1}</td>
              <td>{r.name}</td>
              <td />
              <td className="ctr">{r.unit}</td>
              <td className="num">{formatNumber(r.cost)}</td>
              <td className="num">{formatNumber(r.bookQty)}</td>
              <td className="num">{formatNumber(round(r.bookQty * r.cost))}</td>
              <td className="num">{formatNumber(r.actualQty)}</td>
              <td className="num">{formatNumber(round(r.actualQty * r.cost))}</td>
              <td className="num">{r.diff > 0 ? formatNumber(r.diff) : ''}</td>
              <td className="num">{r.diff > 0 ? formatNumber(round(r.diff * r.cost)) : ''}</td>
              <td className="num">{r.diff < 0 ? formatNumber(-r.diff) : ''}</td>
              <td className="num">{r.diff < 0 ? formatNumber(round(-r.diff * r.cost)) : ''}</td>
              <td>{r.note}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td />
            <td colSpan={4}>Cộng</td>
            <td />
            <td className="num">{q(book)}</td>
            <td />
            <td className="num">{q(actual)}</td>
            <td />
            <td className="num">{q(surplus)}</td>
            <td />
            <td className="num">{q(shortage)}</td>
            <td />
          </tr>
        </tbody>
      </table>
      <div className="print-meta">
        <div>Ý kiến giải quyết số chênh lệch: ………………………………………………………………</div>
      </div>
      <div className="print-date-line">{dateLine(date)}</div>
      <SignatureBlock roles={STOCKTAKE_SIGNATURES} />
    </PrintLayout>
  )
}
