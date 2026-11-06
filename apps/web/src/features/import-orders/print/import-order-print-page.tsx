import { useEffect, useRef, useState } from 'react'
import { PrintLayout } from '@/components/print/print-layout'
import { SignatureBlock } from '@/components/print/signature-block'
import { useImportOrderDetail, usePrintHeader } from '@/data'
import { amountInWords } from '@/utils/amount-in-words'
import { formatDate, formatNumber } from '@wms/shared'
import { VOUCHER_FORMS, loadVoucherForm, saveVoucherForm } from './voucher-form'
import type { VoucherForm } from './voucher-form'

const WAREHOUSE_NAME = 'Kho nguyên liệu'

function dateLine(value: string | Date) {
  const d = new Date(value)
  return `Ngày ${String(d.getDate()).padStart(2, '0')} tháng ${String(d.getMonth() + 1).padStart(2, '0')} năm ${d.getFullYear()}`
}

/** Phiếu nhập kho mẫu 01-VT (TT133/TT200), in A4 dọc. */
export function ImportOrderPrintPage({ id }: { id: string }) {
  const { data: order, isLoading, error } = useImportOrderDetail(id)
  const { data: tax, isLoading: taxLoading, error: taxError } = usePrintHeader()
  const [form, setForm] = useState<VoucherForm>(loadVoucherForm)
  const printed = useRef(false)

  const orgReady = !!tax?.companyName && !!tax?.address && !!tax?.taxCode

  // Chỉ tự in khi có đủ phiếu + header đơn vị; lỗi/thiếu header thì để người dùng xử lý rồi bấm In.
  useEffect(() => {
    if (!order || !orgReady || printed.current) return
    printed.current = true
    const timer = setTimeout(() => window.print(), 300)
    return () => clearTimeout(timer)
  }, [order, orgReady])

  if (isLoading || taxLoading) return <div className="p-4">Đang tải...</div>
  if (error || !order) return <div className="p-4">Không tải được phiếu nhập.</div>
  if (taxError) {
    return <div className="p-4" data-testid="print-header-error">Không tải được thông tin đơn vị để in. Vui lòng thử lại.</div>
  }

  const legalNote = VOUCHER_FORMS.find((f) => f.value === form)?.legalNote
  const invoice = order.hasInvoice
    ? { no: [order.invoiceSymbol, order.invoiceNo].filter(Boolean).join('/'), date: order.invoiceDate }
    : null
  const total = order.items.reduce((sum, i) => sum + Number(i.totalPrice), 0)

  return (
    <PrintLayout
      org={tax}
      formNote={
        <>
          <strong>Mẫu số 01 - VT</strong>
          <div>{legalNote}</div>
        </>
      }
      toolbar={
        <>
          <label>
            Mẫu:{' '}
            <select
              data-testid="print-form-select"
              value={form}
              onChange={(e) => {
                const next = e.target.value as VoucherForm
                setForm(next)
                saveVoucherForm(next)
              }}
            >
              {VOUCHER_FORMS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" data-testid="print-button" onClick={() => window.print()}>
            In
          </button>
        </>
      }
    >
      <h1 className="print-title">Phiếu nhập kho</h1>
      <div className="print-subtitle">{dateLine(order.voucherDate)}</div>
      <div className="print-meta">
        <div className="print-meta-row">
          <span>Số: <strong>{order.voucherNo}</strong></span>
          <span className="print-debit-credit">
            <span>Nợ: ……………</span>
            <span>Có: ……………</span>
          </span>
        </div>
        <div>Họ và tên người giao: {order.supplier?.name}</div>
        <div>
          Theo hóa đơn số: {invoice?.no || '……………'} ngày {invoice?.date ? formatDate(invoice.date) : '……………'}
        </div>
        <div>Nhập tại kho: {WAREHOUSE_NAME} &nbsp; địa điểm: ……………………………</div>
        {order.note && <div>Diễn giải: {order.note}</div>}
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
            <th style={{ width: 60 }}>Theo chứng từ</th>
            <th style={{ width: 55 }}>Thực nhập</th>
          </tr>
          <tr>
            {['A', 'B', 'C', 'D', '1', '2', '3', '4'].map((c) => (
              <th key={c} style={{ fontWeight: 'normal', fontStyle: 'italic' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={item.id}>
              <td className="ctr">{idx + 1}</td>
              <td>{item.ingredient?.name}</td>
              <td />
              <td className="ctr">{item.ingredient?.unit}</td>
              <td className="num">{formatNumber(item.quantity)}</td>
              <td className="num">{formatNumber(item.quantity)}</td>
              <td className="num">{formatNumber(item.unitPrice)}</td>
              <td className="num">{formatNumber(item.totalPrice)}</td>
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
        <div>Số chứng từ gốc kèm theo: {invoice ? 1 : '……'}</div>
      </div>
      <div className="print-date-line">{dateLine(order.voucherDate)}</div>
      <SignatureBlock />
    </PrintLayout>
  )
}
