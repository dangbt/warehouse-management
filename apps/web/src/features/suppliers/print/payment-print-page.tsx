import { PrintLayout } from '@/components/print/print-layout'
import { SignatureBlock } from '@/components/print/signature-block'
import { PrintToolbarButton, dateLine, isOrgReady, useAutoPrint } from '@/components/print/print-utils'
import { usePrintHeader, useSupplierPaymentDetail } from '@/data'
import { amountInWords } from '@/utils/amount-in-words'
import { formatNumber } from '@wms/shared'

const PAYMENT_SIGNATURES = ['Giám đốc', 'Kế toán trưởng', 'Thủ quỹ', 'Người lập phiếu', 'Người nhận tiền'] as const

/** Phiếu chi mẫu 02-TT (TT133) cho khoản thanh toán NCC bằng tiền mặt. */
export function PaymentPrintPage({ id }: { id: string }) {
  const { data: payment, isLoading, error } = useSupplierPaymentDetail(id)
  const { data: org, isLoading: orgLoading, error: orgError } = usePrintHeader()
  const isCash = payment?.method === 'CASH'
  useAutoPrint(!!payment && isCash && isOrgReady(org))

  if (isLoading || orgLoading) return <div className="p-4">Đang tải...</div>
  if (error || !payment) return <div className="p-4">Không tải được khoản thanh toán.</div>
  if (!isCash) return <div className="p-4" data-testid="print-not-cash">Chỉ in phiếu chi cho khoản thanh toán tiền mặt.</div>
  if (orgError) return <div className="p-4" data-testid="print-header-error">Không tải được thông tin đơn vị để in. Vui lòng thử lại.</div>

  const amount = Number(payment.amount)

  return (
    <PrintLayout
      org={org}
      formNote={
        <>
          <strong>Mẫu số 02 - TT</strong>
          <div>(Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính)</div>
        </>
      }
      toolbar={<PrintToolbarButton />}
    >
      <h1 className="print-title">Phiếu chi</h1>
      <div className="print-subtitle">{dateLine(payment.createdAt)}</div>
      <div className="print-meta">
        <div className="print-meta-row">
          <span>Số: <strong>{payment.id.slice(0, 8).toUpperCase()}</strong></span>
          <span className="print-debit-credit">
            <span>Nợ: ……………</span>
            <span>Có: ……………</span>
          </span>
        </div>
        <div>Họ và tên người nhận tiền: {payment.supplier.name}</div>
        <div>Địa chỉ: {payment.supplier.address || '……………………………'}</div>
        <div>Lý do chi: {payment.note || 'Thanh toán công nợ nhà cung cấp'}</div>
        <div>Số tiền: <strong>{formatNumber(amount)}</strong> đồng</div>
        <div>Viết bằng chữ: <strong>{amountInWords(amount)}</strong></div>
        <div>Kèm theo: …… chứng từ gốc</div>
      </div>
      <div className="print-date-line">{dateLine(payment.createdAt)}</div>
      <SignatureBlock roles={PAYMENT_SIGNATURES} />
      <div className="print-meta">
        <div>Đã nhận đủ số tiền (viết bằng chữ): ………………………………………………………………</div>
        <div>+ Tỷ giá ngoại tệ (vàng bạc, đá quý): ……………</div>
        <div>+ Số tiền quy đổi: ……………</div>
      </div>
    </PrintLayout>
  )
}
