import { PrintLayout } from '@/components/print/print-layout'
import { SignatureBlock } from '@/components/print/signature-block'
import { PrintToolbarButton, dateLine, isOrgReady, useAutoPrint } from '@/components/print/print-utils'
import { usePrintHeader, useStockExportVoucher } from '@/data'
import { amountInWords } from '@/utils/amount-in-words'
import { formatNumber } from '@wms/shared'

const WAREHOUSE_NAME = 'Kho nguyên liệu'
const REASONS: Record<string, string> = { DAMAGED: 'Hỏng', EXPIRED: 'Hết hạn', RETURN: 'Trả NCC', INTERNAL_USE: 'Sử dụng nội bộ', OTHER: 'Khác' }
const EXPORT_SIGNATURES = ['Người lập phiếu', 'Người nhận hàng', 'Thủ kho', 'Kế toán trưởng', 'Giám đốc'] as const

function reasonText(note: string | null | undefined) {
  if (!note) return ''
  const [code, ...rest] = note.split(': ')
  const label = REASONS[code] ?? code
  return rest.length ? `${label}: ${rest.join(': ')}` : label
}

/** Phiếu xuất kho mẫu 02-VT (TT133/TT200), in A4 dọc. Đơn giá = giá vốn theo lô đã xuất. */
export function StockExportPrintPage({ id }: { id: string }) {
  const { data: voucher, isLoading, error } = useStockExportVoucher(id)
  const { data: org, isLoading: orgLoading, error: orgError } = usePrintHeader()
  useAutoPrint(!!voucher && isOrgReady(org))

  if (isLoading || orgLoading) return <div className="p-4">Đang tải...</div>
  if (error || !voucher) return <div className="p-4">Không tải được phiếu xuất.</div>
  if (orgError) return <div className="p-4" data-testid="print-header-error">Không tải được thông tin đơn vị để in. Vui lòng thử lại.</div>

  const total = voucher.lines.reduce((sum, l) => sum + l.totalCost, 0)
  const reason = reasonText(voucher.lines[0]?.note)
  const receiver = voucher.lines[0]?.createdBy

  return (
    <PrintLayout
      org={org}
      formNote={
        <>
          <strong>Mẫu số 02 - VT</strong>
          <div>(Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính)</div>
        </>
      }
      toolbar={<PrintToolbarButton />}
    >
      <h1 className="print-title">Phiếu xuất kho</h1>
      <div className="print-subtitle">{dateLine(voucher.voucherDate)}</div>
      <div className="print-meta">
        <div className="print-meta-row">
          <span>Số: <strong>{voucher.voucherNo}</strong></span>
          <span className="print-debit-credit">
            <span>Nợ: ……………</span>
            <span>Có: ……………</span>
          </span>
        </div>
        <div>Họ và tên người nhận hàng: {receiver || '……………………………'}</div>
        <div>Lý do xuất kho: {reason || '……………………………'}</div>
        <div>Xuất tại kho: {WAREHOUSE_NAME} &nbsp; địa điểm: ……………………………</div>
      </div>
      <table className="print-table">
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: 30 }}>STT</th>
            <th rowSpan={2}>Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa</th>
            <th rowSpan={2} style={{ width: 50 }}>Mã số</th>
            <th rowSpan={2} style={{ width: 45 }}>ĐVT</th>
            <th colSpan={2}>Số lượng</th>
            <th rowSpan={2} style={{ width: 75 }}>Đơn giá</th>
            <th rowSpan={2} style={{ width: 85 }}>Thành tiền</th>
          </tr>
          <tr>
            <th style={{ width: 60 }}>Yêu cầu</th>
            <th style={{ width: 55 }}>Thực xuất</th>
          </tr>
          <tr>
            {['A', 'B', 'C', 'D', '1', '2', '3', '4'].map((c) => (
              <th key={c} style={{ fontWeight: 'normal', fontStyle: 'italic' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {voucher.lines.map((l, idx) => (
            <tr key={l.id}>
              <td className="ctr">{idx + 1}</td>
              <td>{l.ingredient.name}</td>
              <td />
              <td className="ctr">{l.ingredient.unit}</td>
              <td className="num">{formatNumber(l.quantity)}</td>
              <td className="num">{formatNumber(l.quantity)}</td>
              <td className="num">{formatNumber(l.unitCost)}</td>
              <td className="num">{formatNumber(l.totalCost)}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td />
            <td colSpan={6}>Cộng</td>
            <td className="num">{formatNumber(total)}</td>
          </tr>
        </tbody>
      </table>
      <div className="print-meta">
        <div>Tổng số tiền (viết bằng chữ): <strong>{amountInWords(total)}</strong></div>
        <div>Số chứng từ gốc kèm theo: ……</div>
      </div>
      <div className="print-date-line">{dateLine(voucher.voucherDate)}</div>
      <SignatureBlock roles={EXPORT_SIGNATURES} />
    </PrintLayout>
  )
}
