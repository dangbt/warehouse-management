import { useMemo, useState } from 'react'
import { RefreshCw, FileSpreadsheet, Calculator } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinSelect, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { formatNumber, VAT_RATE_LABELS } from '@wms/shared'
import type { VatRate } from '@wms/shared'
import { useOutputRevenue, useRecomputeOutputVat } from '@/data'
import type { OutputRevenueReport } from '@/data'
import { exportSheet } from '@/utils/excel'
import { useToastStore } from '@/stores/toast.store'
import { useAuthStore } from '@/stores/auth.store'

/** Nhãn thuế suất, an toàn cho mã lạ. */
function vatLabel(rate: string): string {
  return VAT_RATE_LABELS[rate as VatRate] ?? rate
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

/** Dòng phẳng cho WinDataGrid: nhóm theo thuế suất + dòng tổng cuối. */
interface FlatRow {
  id: string
  kind: 'data' | 'grandTotal'
  vatRate?: string
  label?: string
  orderCount: number
  amountBeforeTax: number
  vatAmount: number
  gross: number
}

function flatten(report: OutputRevenueReport): FlatRow[] {
  const rows: FlatRow[] = report.groups.map((g) => ({
    id: `g-${g.vatRate}`,
    kind: 'data',
    vatRate: g.vatRate,
    orderCount: g.orderCount,
    amountBeforeTax: g.amountBeforeTax,
    vatAmount: g.vatAmount,
    gross: g.gross,
  }))
  rows.push({
    id: 'grand-total',
    kind: 'grandTotal',
    label: 'TỔNG CỘNG',
    orderCount: report.total.orderCount,
    amountBeforeTax: report.total.amountBeforeTax,
    vatAmount: report.total.vatAmount,
    gross: report.total.gross,
  })
  return rows
}

const columns: Column<FlatRow>[] = [
  {
    key: 'vatRate',
    header: 'Thuế suất',
    width: 200,
    render: (r) => <span className="font-semibold">{r.kind === 'grandTotal' ? r.label : vatLabel(r.vatRate ?? '')}</span>,
  },
  { key: 'orderCount', header: 'Số đơn', width: 90, align: 'right', render: (r) => formatNumber(r.orderCount) },
  { key: 'amountBeforeTax', header: 'Doanh thu chưa thuế', width: 150, align: 'right', render: (r) => formatNumber(r.amountBeforeTax) },
  { key: 'vatAmount', header: 'Thuế VAT đầu ra', width: 140, align: 'right', render: (r) => formatNumber(r.vatAmount) },
  { key: 'gross', header: 'Tổng thu (gồm thuế)', width: 150, align: 'right', render: (r) => formatNumber(r.gross) },
]

function rowClass(r: FlatRow): string {
  return r.kind === 'grandTotal' ? 'bg-win-active-title/10 font-bold' : ''
}

export function OutputRevenuePage() {
  const [periodType, setPeriodType] = useState<'MONTH' | 'QUARTER'>('QUARTER')
  const periodOptions = useMemo(() => buildPeriodOptions(periodType), [periodType])
  const [period, setPeriod] = useState<string>(() => buildPeriodOptions('QUARTER')[0].value)
  const [confirmRecompute, setConfirmRecompute] = useState(false)

  const { data, isLoading, refetch } = useOutputRevenue(period)
  const recompute = useRecomputeOutputVat()
  const toast = useToastStore()
  const canManage = useAuthStore((s) => s.hasPermission)('tax:manage')

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
      const rows: (string | number | null)[][] = data.groups.map((g) => [
        vatLabel(g.vatRate),
        g.orderCount,
        g.amountBeforeTax,
        g.vatAmount,
        g.gross,
      ])
      await exportSheet({
        fileName: `DoanhThu_TheoThueSuat_${data.period.value}.xlsx`,
        title: 'BẢNG KÊ DOANH THU BÁN HÀNG THEO THUẾ SUẤT',
        headerLines,
        columns: [
          { header: 'Thuế suất', width: 24 },
          { header: 'Số đơn', width: 10, align: 'right' },
          { header: 'Doanh thu chưa thuế', width: 20, align: 'right' },
          { header: 'Thuế VAT đầu ra', width: 18, align: 'right' },
          { header: 'Tổng thu (gồm thuế)', width: 20, align: 'right' },
        ],
        rows,
        totalRow: ['TỔNG CỘNG', data.total.orderCount, data.total.amountBeforeTax, data.total.vatAmount, data.total.gross],
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
        {canManage && (
          <WinToolbar.Button
            icon={<Calculator size={14} />}
            label="Tính lại thuế kỳ này"
            onClick={() => setConfirmRecompute(true)}
            disabled={recompute.isPending}
          />
        )}
        <WinToolbar.Button icon={<FileSpreadsheet size={14} />} label="Xuất Excel" onClick={handleExport} disabled={!data || isLoading} />
      </WinToolbar>

      <div className="px-3 py-1.5 border-b border-win-grid-border text-win-base text-win-text-secondary shrink-0">
        {data ? (
          <span>
            {data.settings.companyName ?? '—'} · MST: {data.settings.taxCode ?? '—'} · {data.period.label}
          </span>
        ) : (
          <span>Doanh thu bán hàng theo thuế suất</span>
        )}
      </div>

      <WinDataGrid columns={columns} data={flatRows} loading={isLoading} getRowClass={rowClass} />

      <WinMessageBox
        type="question"
        title="Xác nhận"
        message={`Tính lại thuế đầu ra cho tất cả đơn KiotViet trong ${periodOptions.find((o) => o.value === period)?.label ?? period}? Snapshot cũ của kỳ sẽ bị ghi đè theo thuế suất món và cấu hình hiện tại.`}
        open={confirmRecompute}
        buttons="yes_no"
        onResult={(r) => {
          if (r === 'yes') recompute.mutate(period)
          setConfirmRecompute(false)
        }}
      />
    </div>
  )
}
