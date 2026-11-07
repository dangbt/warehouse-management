import { PrintLayout } from '@/components/print/print-layout'
import { SignatureBlock } from '@/components/print/signature-block'
import { PrintToolbarButton, dateLine, isOrgReady, useAutoPrint } from '@/components/print/print-utils'
import { usePrintHeader, useStockTransfer } from '@/data'
import { amountInWords } from '@/utils/amount-in-words'
import { formatNumber } from '@wms/shared'

const SIGNATURES = ['Người lập phiếu', 'Người nhận hàng', 'Thủ kho xuất', 'Thủ kho nhập', 'Kế toán trưởng'] as const

/** Phiếu xuất kho kiêm vận chuyển nội bộ — mẫu 03-XKNB, in A4 dọc. Đơn giá = giá vốn theo lô đã chuyển. */
export function StockTransferPrintPage({ id }: { id: string }) {
  const { data: tr, isLoading, error } = useStockTransfer(id)
  const { data: org, isLoading: orgLoading, error: orgError } = usePrintHeader()
  useAutoPrint(!!tr && isOrgReady(org))

  if (isLoading || orgLoading) return <div className="p-4">Đang tải...</div>
  if (error || !tr) return <div className="p-4">Không tải được phiếu chuyển kho.</div>
  if (orgError) return <div className="p-4" data-testid="print-header-error">Không tải được thông tin đơn vị để in. Vui lòng thử lại.</div>

  // Giá vốn theo NL = tổng giá vốn thực xuất / tổng SL thực xuất (chỉ có sau khi duyệt).
  const costOf = (ingredientId: string) => {
    const rows = tr.transactions.filter((t) => t.ingredientId === ingredientId)
    return {
      qty: rows.reduce((s, t) => s + Math.abs(Number(t.quantity)), 0),
      total: rows.reduce((s, t) => s + Number(t.totalCost ?? 0), 0),
    }
  }
  const lines = tr.items.map((i) => {
    const c = costOf(i.ingredientId)
    const qty = Number(i.quantity)
    return { id: i.id, name: i.ingredient.name, unit: i.ingredient.unit, qty, unitCost: c.qty ? c.total / c.qty : 0, total: c.qty ? Math.round(c.total * (qty / c.qty)) : 0 }
  })
  const total = lines.reduce((s, l) => s + l.total, 0)

  return (
    <PrintLayout
      org={org}
      formNote={
        <>
          <strong>Mẫu số 03 - XKNB</strong>
          <div>(Ban hành theo Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính)</div>
        </>
      }
      toolbar={<PrintToolbarButton />}
    >
      <h1 className="print-title">Phiếu xuất kho kiêm vận chuyển nội bộ</h1>
      <div className="print-subtitle">{dateLine(tr.voucherDate)}</div>
      <div className="print-meta">
        <div>Số: <strong>{tr.voucherNo}</strong></div>
        <div>Xuất tại kho: {tr.fromWarehouse.name}</div>
        <div>Nhập tại kho: {tr.toWarehouse.name}</div>
        <div>Nội dung: {tr.note || 'Chuyển kho nội bộ'}</div>
      </div>
      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: 30 }}>STT</th>
            <th>Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa</th>
            <th style={{ width: 45 }}>ĐVT</th>
            <th style={{ width: 70 }}>Số lượng</th>
            <th style={{ width: 80 }}>Đơn giá</th>
            <th style={{ width: 90 }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, idx) => (
            <tr key={l.id}>
              <td className="ctr">{idx + 1}</td>
              <td>{l.name}</td>
              <td className="ctr">{l.unit}</td>
              <td className="num">{formatNumber(l.qty)}</td>
              <td className="num">{formatNumber(l.unitCost)}</td>
              <td className="num">{formatNumber(l.total)}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td />
            <td colSpan={4}>Cộng</td>
            <td className="num">{formatNumber(total)}</td>
          </tr>
        </tbody>
      </table>
      <div className="print-meta">
        <div>Tổng số tiền (viết bằng chữ): <strong>{amountInWords(total)}</strong></div>
      </div>
      <div className="print-date-line">{dateLine(tr.voucherDate)}</div>
      <SignatureBlock roles={SIGNATURES} />
    </PrintLayout>
  )
}
