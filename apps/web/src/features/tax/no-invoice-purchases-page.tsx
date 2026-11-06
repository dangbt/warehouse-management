import { useMemo, useState } from 'react'
import { RefreshCw, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinSelect } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { formatNumber } from '@wms/shared'
import { useNoInvoicePurchases } from '@/data'
import type { NoInvoicePurchaseReport, NoInvoicePurchaseRow } from '@/data'
import { exportSheet } from '@/utils/excel'
import { useToastStore } from '@/stores/toast.store'

/** Định dạng ngày ISO → dd/mm/yyyy (theo giờ VN). */
function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const vn = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const day = String(vn.getUTCDate()).padStart(2, '0')
  const month = String(vn.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${vn.getUTCFullYear()}`
}

/** Danh sách kỳ gần đây để chọn (tháng hoặc quý). */
function buildPeriodOptions(periodType: 'MONTH' | 'QUARTER'): { value: string; label: string }[] {
  const now = new Date()
  const year = now.getFullYear()
  if (periodType === 'QUARTER') {
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1
    const opts: { value: string; label: string }[] = []
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

/** Dòng phẳng cho grid: dòng dữ liệu + dòng tổng cuối. */
interface FlatRow extends Partial<NoInvoicePurchaseRow> {
  id: string
  kind: 'data' | 'grandTotal'
  label?: string
}

const columns: Column<FlatRow>[] = [
  { key: 'stt', header: 'STT', width: 48, align: 'center', render: (r) => (r.kind === 'data' ? r.stt : '') },
  { key: 'date', header: 'Ngày mua', width: 90, align: 'center', render: (r) => (r.kind === 'data' ? fmtDate(r.date ?? null) : '') },
  {
    key: 'sellerName',
    header: 'Người bán',
    width: 170,
    render: (r) => (r.kind === 'grandTotal' ? <span className="font-bold">{r.label}</span> : (r.sellerName ?? '')),
  },
  { key: 'sellerAddress', header: 'Địa chỉ', width: 200, render: (r) => (r.kind === 'data' ? (r.sellerAddress ?? '') : '') },
  {
    key: 'sellerIdNumber',
    header: 'Số CCCD',
    width: 130,
    render: (r) => {
      if (r.kind !== 'data') return ''
      if (r.missingIdNumber) {
        return (
          <span className="flex items-center gap-1 text-win-warning" title="Thiếu CCCD">
            <AlertTriangle size={14} /> Thiếu CCCD
          </span>
        )
      }
      return r.sellerIdNumber ?? ''
    },
  },
  { key: 'ingredientName', header: 'Tên hàng', width: 160, render: (r) => (r.kind === 'data' ? (r.ingredientName ?? '') : '') },
  { key: 'unit', header: 'ĐVT', width: 60, align: 'center', render: (r) => (r.kind === 'data' ? (r.unit ?? '') : '') },
  { key: 'quantity', header: 'Số lượng', width: 90, align: 'right', render: (r) => (r.kind === 'data' ? formatNumber(r.quantity ?? 0) : '') },
  { key: 'unitPrice', header: 'Đơn giá', width: 110, align: 'right', render: (r) => (r.kind === 'data' ? formatNumber(r.unitPrice ?? 0) : '') },
  { key: 'totalPrice', header: 'Thành tiền', width: 120, align: 'right', render: (r) => (r.totalPrice != null ? formatNumber(r.totalPrice) : '') },
]

function rowClass(r: FlatRow): string {
  if (r.kind === 'grandTotal') return 'bg-win-active-title/10 font-bold'
  if (r.kind === 'data' && r.missingIdNumber) return 'bg-win-warning/20'
  return ''
}

function flatten(report: NoInvoicePurchaseReport): FlatRow[] {
  const rows: FlatRow[] = report.rows.map((r) => ({ ...r, id: `${r.importOrderCode}-${r.stt}`, kind: 'data' as const }))
  rows.push({ id: 'grand-total', kind: 'grandTotal', label: 'TỔNG CỘNG', totalPrice: report.total.totalPrice })
  return rows
}

export function NoInvoicePurchasesPage() {
  const [periodType, setPeriodType] = useState<'MONTH' | 'QUARTER'>('QUARTER')
  const periodOptions = useMemo(() => buildPeriodOptions(periodType), [periodType])
  const [period, setPeriod] = useState<string>(() => buildPeriodOptions('QUARTER')[0].value)

  const { data, isLoading, refetch } = useNoInvoicePurchases(period)
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
        `Địa chỉ: ${data.settings.address ?? '—'}`,
        `Kỳ: ${data.period.label}`,
      ]
      const rows: (string | number | null)[][] = data.rows.map((r) => [
        r.stt,
        fmtDate(r.date),
        r.sellerName,
        r.sellerAddress ?? '',
        r.missingIdNumber ? 'Thiếu CCCD' : (r.sellerIdNumber ?? ''),
        r.ingredientName,
        r.unit,
        r.quantity,
        r.unitPrice,
        r.totalPrice,
      ])
      // Dòng trống + chữ ký sau dòng tổng.
      const signatureRows: (string | number | null)[][] = [
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', 'Người lập bảng kê', '', '', '', '', '', 'Giám đốc', ''],
        ['', '', '(Ký, ghi rõ họ tên)', '', '', '', '', '', '(Ký, đóng dấu, ghi rõ họ tên)', ''],
      ]
      await exportSheet({
        fileName: `BangKe_01TNDN_${data.period.value}.xlsx`,
        title: 'BẢNG KÊ THU MUA HÀNG HOÁ, DỊCH VỤ MUA VÀO KHÔNG CÓ HOÁ ĐƠN (Mẫu 01/TNDN)',
        headerLines,
        columns: [
          { header: 'STT', width: 6, align: 'center' },
          { header: 'Ngày mua', width: 12, align: 'center' },
          { header: 'Người bán', width: 24 },
          { header: 'Địa chỉ', width: 28 },
          { header: 'Số CCCD', width: 16 },
          { header: 'Tên hàng', width: 24 },
          { header: 'ĐVT', width: 8, align: 'center' },
          { header: 'Số lượng', width: 12, align: 'right' },
          { header: 'Đơn giá', width: 14, align: 'right' },
          { header: 'Thành tiền', width: 16, align: 'right' },
        ],
        rows: [...rows, ...signatureRows],
        totalRow: ['TỔNG CỘNG', '', '', '', '', '', '', '', '', data.total.totalPrice],
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
          <WinSelect options={periodOptions} value={period} onChange={(e) => setPeriod(e.target.value)} />
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
          <span>Bảng kê thu mua không có hoá đơn (01/TNDN)</span>
        )}
      </div>

      <WinDataGrid columns={columns} data={flatRows} loading={isLoading} getRowClass={rowClass} />
    </div>
  )
}
