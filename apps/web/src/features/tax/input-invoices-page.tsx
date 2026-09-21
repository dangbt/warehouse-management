import { useMemo, useState } from 'react'
import { RefreshCw, FileSpreadsheet } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinSelect } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { formatNumber, VAT_RATE_LABELS } from '@wms/shared'
import type { VatRate } from '@wms/shared'
import { useInputInvoices } from '@/data'
import type { InputInvoiceReport } from '@/data'
import { exportSheet } from '@/utils/excel'
import { useToastStore } from '@/stores/toast.store'

/** Nhãn thuế suất, an toàn cho mã lạ. */
function vatLabel(rate: string): string {
  return VAT_RATE_LABELS[rate as VatRate] ?? rate
}

/** Định dạng ngày ISO → dd/mm/yyyy (theo giờ VN). */
function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const day = String(vn.getUTCDate()).padStart(2, '0')
  const month = String(vn.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${vn.getUTCFullYear()}`
}

/** Dòng phẳng để đưa vào WinDataGrid (gồm dòng dữ liệu, cộng nhóm và tổng cuối). */
interface FlatRow {
  id: string
  kind: 'header' | 'data' | 'groupTotal' | 'grandTotal'
  label?: string
  stt?: number
  invoiceSymbol?: string | null
  invoiceNo?: string | null
  invoiceDate?: string | null
  supplierName?: string
  supplierTaxCode?: string | null
  subtotal?: number
  vatAmount?: number
  importOrderCode?: string
  note?: string
}

/** Danh sách kỳ gần đây để chọn (tháng hoặc quý). */
function buildPeriodOptions(periodType: 'MONTH' | 'QUARTER'): { value: string; label: string }[] {
  const now = new Date()
  const year = now.getFullYear()
  if (periodType === 'QUARTER') {
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1
    const opts: { value: string; label: string }[] = []
    // Kỳ hiện tại + 7 quý trước.
    for (let i = 0; i < 8; i++) {
      let q = currentQuarter - i
      let y = year
      while (q <= 0) {
        q += 4
        y -= 1
      }
      opts.push({ value: `${y}-Q${q}`, label: `Quý ${q}/${y}` })
    }
    return opts
  }
  const opts: { value: string; label: string }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(year, now.getMonth() - i, 1)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    opts.push({ value: `${d.getFullYear()}-${m}`, label: `Tháng ${m}/${d.getFullYear()}` })
  }
  return opts
}

function flatten(report: InputInvoiceReport): FlatRow[] {
  const rows: FlatRow[] = []
  for (const group of report.groups) {
    rows.push({ id: `h-${group.vatRate}`, kind: 'header', label: `Thuế suất: ${vatLabel(group.vatRate)}` })
    for (const r of group.rows) {
      rows.push({
        id: `${group.vatRate}-${r.importOrderCode}-${r.stt}`,
        kind: 'data',
        stt: r.stt,
        invoiceSymbol: r.invoiceSymbol,
        invoiceNo: r.invoiceNo,
        invoiceDate: r.invoiceDate,
        supplierName: r.supplierName,
        supplierTaxCode: r.supplierTaxCode,
        subtotal: r.subtotal,
        vatAmount: r.vatAmount,
        importOrderCode: r.importOrderCode,
        note: r.note,
      })
    }
    rows.push({
      id: `gt-${group.vatRate}`,
      kind: 'groupTotal',
      label: `Cộng nhóm ${vatLabel(group.vatRate)}`,
      subtotal: group.subtotal,
      vatAmount: group.vatAmount,
    })
  }
  rows.push({
    id: 'grand-total',
    kind: 'grandTotal',
    label: 'TỔNG CỘNG',
    subtotal: report.total.subtotal,
    vatAmount: report.total.vatAmount,
  })
  return rows
}

const columns: Column<FlatRow>[] = [
  {
    key: 'stt',
    header: 'STT',
    width: 48,
    align: 'center',
    render: (r) => (r.kind === 'data' ? r.stt : ''),
  },
  {
    key: 'invoiceSymbol',
    header: 'Ký hiệu HĐ',
    width: 100,
    render: (r) => {
      if (r.kind === 'header') return <span className="font-semibold">{r.label}</span>
      if (r.kind === 'groupTotal' || r.kind === 'grandTotal') return <span className="font-semibold">{r.label}</span>
      return r.invoiceSymbol ?? ''
    },
  },
  { key: 'invoiceNo', header: 'Số HĐ', width: 90, render: (r) => (r.kind === 'data' ? (r.invoiceNo ?? '') : '') },
  { key: 'invoiceDate', header: 'Ngày HĐ', width: 90, align: 'center', render: (r) => (r.kind === 'data' ? fmtDate(r.invoiceDate ?? null) : '') },
  { key: 'supplierName', header: 'Nhà cung cấp', width: 180, render: (r) => (r.kind === 'data' ? (r.supplierName ?? '') : '') },
  { key: 'supplierTaxCode', header: 'MST NCC', width: 120, render: (r) => (r.kind === 'data' ? (r.supplierTaxCode ?? '') : '') },
  {
    key: 'subtotal',
    header: 'Tiền hàng',
    width: 120,
    align: 'right',
    render: (r) => (r.subtotal != null && r.kind !== 'header' ? <span className={r.subtotal < 0 ? 'text-win-error' : ''}>{formatNumber(r.subtotal)}</span> : ''),
  },
  {
    key: 'vatAmount',
    header: 'Tiền thuế',
    width: 120,
    align: 'right',
    render: (r) => (r.vatAmount != null && r.kind !== 'header' ? <span className={r.vatAmount < 0 ? 'text-win-error' : ''}>{formatNumber(r.vatAmount)}</span> : ''),
  },
  {
    key: 'note',
    header: 'Chứng từ / Ghi chú',
    width: 160,
    render: (r) => {
      if (r.kind !== 'data') return ''
      return r.note ? r.note : r.importOrderCode
    },
  },
]

function rowClass(r: FlatRow): string {
  if (r.kind === 'header') return 'bg-win-grid-header font-semibold'
  if (r.kind === 'groupTotal') return 'bg-win-control font-semibold'
  if (r.kind === 'grandTotal') return 'bg-win-active-title/10 font-bold'
  return ''
}

export function InputInvoicesPage() {
  // Kỳ mặc định: quý hiện tại (phù hợp mặc định QUARTER của cấu hình).
  const [periodType, setPeriodType] = useState<'MONTH' | 'QUARTER'>('QUARTER')
  const periodOptions = useMemo(() => buildPeriodOptions(periodType), [periodType])
  const [period, setPeriod] = useState<string>(() => buildPeriodOptions('QUARTER')[0].value)

  const { data, isLoading, refetch } = useInputInvoices(period)
  const toast = useToastStore()

  const flatRows = useMemo(() => (data ? flatten(data) : []), [data])

  const changePeriodType = (t: 'MONTH' | 'QUARTER') => {
    setPeriodType(t)
    setPeriod(buildPeriodOptions(t)[0].value)
  }

  const handleExport = async () => {
    if (!data) return
    try {
      const headerLines = [
        `Người nộp thuế: ${data.settings.companyName ?? '—'}`,
        `Mã số thuế: ${data.settings.taxCode ?? '—'}`,
        `Kỳ: ${data.period.label}`,
      ]
      const rows: (string | number | null)[][] = []
      for (const group of data.groups) {
        rows.push([`Thuế suất: ${vatLabel(group.vatRate)}`, '', '', '', '', '', '', '', ''])
        for (const r of group.rows) {
          rows.push([
            r.stt,
            r.invoiceSymbol ?? '',
            r.invoiceNo ?? '',
            fmtDate(r.invoiceDate),
            r.supplierName,
            r.supplierTaxCode ?? '',
            r.subtotal,
            r.vatAmount,
            r.note ? r.note : r.importOrderCode,
          ])
        }
        rows.push([`Cộng nhóm ${vatLabel(group.vatRate)}`, '', '', '', '', '', group.subtotal, group.vatAmount, ''])
      }
      await exportSheet({
        fileName: `BangKe_MuaVao_${data.period.value}.xlsx`,
        title: 'BẢNG KÊ HOÁ ĐƠN, CHỨNG TỪ HÀNG HOÁ DỊCH VỤ MUA VÀO',
        headerLines,
        columns: [
          { header: 'STT', width: 6, align: 'center' },
          { header: 'Ký hiệu HĐ', width: 14 },
          { header: 'Số HĐ', width: 12 },
          { header: 'Ngày HĐ', width: 12, align: 'center' },
          { header: 'Nhà cung cấp', width: 28 },
          { header: 'MST NCC', width: 16 },
          { header: 'Tiền hàng', width: 16, align: 'right' },
          { header: 'Tiền thuế', width: 16, align: 'right' },
          { header: 'Chứng từ / Ghi chú', width: 22 },
        ],
        rows,
        totalRow: ['TỔNG CỘNG', '', '', '', '', '', data.total.subtotal, data.total.vatAmount, ''],
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không xuất được Excel')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button label="Tháng" active={periodType === 'MONTH'} onClick={() => changePeriodType('MONTH')} />
        <WinToolbar.Button label="Quý" active={periodType === 'QUARTER'} onClick={() => changePeriodType('QUARTER')} />
        <WinToolbar.Separator />
        <div className="w-44 px-1">
          <WinSelect
            options={periodOptions}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Làm mới" onClick={() => refetch()} />
        <WinToolbar.Button icon={<FileSpreadsheet size={14} />} label="Xuất Excel" onClick={handleExport} disabled={!data || isLoading} />
      </WinToolbar>

      <div className="px-3 py-1.5 border-b border-win-grid-border text-win-base text-win-text-secondary shrink-0">
        {data ? (
          <span>
            {data.settings.companyName ?? '—'} · MST: {data.settings.taxCode ?? '—'} · {data.period.label}
          </span>
        ) : (
          <span>Bảng kê hoá đơn mua vào</span>
        )}
      </div>

      <WinDataGrid columns={columns} data={flatRows} loading={isLoading} getRowClass={rowClass} />
    </div>
  )
}
