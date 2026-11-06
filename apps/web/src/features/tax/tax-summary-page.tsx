import { useMemo, useState } from 'react'
import { RefreshCw, FileSpreadsheet, Lock, Unlock, AlertTriangle } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinSelect, WinInput, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { formatNumber, VAT_RATE_LABELS } from '@wms/shared'
import type { VatRate } from '@wms/shared'
import { useTaxSummary, useCloseTaxPeriod, useReopenTaxPeriod } from '@/data'
import type { TaxSummaryResult, VatDeductionSummaryResult, HouseholdSummaryResult } from '@/data'
import { exportSheet } from '@/utils/excel'
import { useToastStore } from '@/stores/toast.store'
import { useAuthStore } from '@/stores/auth.store'

const DISCLAIMER = 'Số liệu tham khảo để lập tờ khai — kiểm tra lại với kế toán trước khi nộp.'

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

/** Một dòng chỉ tiêu tổng hợp (nhãn + giá trị). */
interface MetricRow {
  id: string
  label: string
  value: number
  emphasis?: boolean
}

const metricColumns: Column<MetricRow>[] = [
  {
    key: 'label',
    header: 'Chỉ tiêu',
    width: 360,
    render: (r) => <span className={r.emphasis ? 'font-bold' : ''}>{r.label}</span>,
  },
  {
    key: 'value',
    header: 'Số tiền (đồng)',
    width: 200,
    align: 'right',
    render: (r) => <span className={r.emphasis ? 'font-bold' : ''}>{formatNumber(r.value)}</span>,
  },
]

function vatDeductionMetrics(s: VatDeductionSummaryResult): MetricRow[] {
  return [
    { id: 'out-before', label: 'Doanh thu chưa thuế (đầu ra)', value: s.output.totalBeforeTax },
    { id: 'out-vat', label: 'Thuế GTGT đầu ra', value: s.output.totalVat },
    { id: 'in-before', label: 'Giá trị mua vào chưa thuế', value: s.input.totalBeforeTax },
    { id: 'in-vat', label: 'Thuế GTGT đầu vào được khấu trừ', value: s.input.totalVat },
    { id: 'carried', label: 'Thuế kỳ trước chuyển sang', value: s.carriedForwardIn },
    { id: 'payable', label: 'Thuế GTGT phải nộp kỳ này', value: s.payable, emphasis: true },
    { id: 'carry-next', label: 'Thuế còn được khấu trừ chuyển kỳ sau', value: s.carryToNext, emphasis: true },
  ]
}

function householdMetrics(s: HouseholdSummaryResult): MetricRow[] {
  return [
    { id: 'revenue', label: 'Doanh thu trong kỳ', value: s.revenue },
    { id: 'ytd', label: 'Doanh thu luỹ kế từ đầu năm', value: s.yearToDateRevenue },
    { id: 'threshold', label: 'Ngưỡng doanh thu miễn thuế/năm', value: s.exemptThreshold },
    { id: 'vat', label: `Thuế GTGT (${s.vatPercent}%)`, value: s.vat, emphasis: true },
    { id: 'pit', label: `Thuế TNCN (${s.pitPercent}%)`, value: s.pit, emphasis: true },
  ]
}

function rowClass(r: MetricRow): string {
  return r.emphasis ? 'bg-win-active-title/10 font-bold' : ''
}

export function TaxSummaryPage() {
  const [periodType, setPeriodType] = useState<'MONTH' | 'QUARTER'>('QUARTER')
  const periodOptions = useMemo(() => buildPeriodOptions(periodType), [periodType])
  const [period, setPeriod] = useState<string>(() => buildPeriodOptions('QUARTER')[0].value)
  // Ô nhập "Thuế kỳ trước chuyển sang" (chỉ VAT_DEDUCTION). Rỗng ⇒ backend tự lấy từ kỳ chốt trước.
  const [carriedForwardInput, setCarriedForwardInput] = useState<string>('')
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)

  const carriedForward = carriedForwardInput.trim() === '' ? undefined : Number(carriedForwardInput)
  const { data, isLoading, refetch } = useTaxSummary(period, carriedForward)
  const closePeriod = useCloseTaxPeriod()
  const reopenPeriod = useReopenTaxPeriod()
  const toast = useToastStore()
  const canManage = useAuthStore((s) => s.hasPermission)('tax:manage')

  const isVat = data?.regime === 'VAT_DEDUCTION'
  const metrics = useMemo<MetricRow[]>(() => {
    if (!data) return []
    return data.regime === 'VAT_DEDUCTION' ? vatDeductionMetrics(data) : householdMetrics(data)
  }, [data])

  const unsnapshotted = data?.regime === 'VAT_DEDUCTION' ? data.unsnapshottedOrders : 0
  const belowThreshold = data?.regime === 'HOUSEHOLD' ? data.belowExemptThreshold : false
  const closed = data?.closed ?? false

  const changePeriodType = (t: 'MONTH' | 'QUARTER') => {
    setPeriodType(t)
    setPeriod(buildPeriodOptions(t)[0].value)
  }

  const handleExport = async () => {
    if (!data) return
    try {
      await exportSummaryExcel(data)
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
        {canManage && !closed && (
          <WinToolbar.Button
            icon={<Lock size={14} />}
            label="Chốt kỳ"
            onClick={() => setConfirmClose(true)}
            disabled={!data || isLoading || closePeriod.isPending || unsnapshotted > 0}
          />
        )}
        {canManage && closed && (
          <WinToolbar.Button
            icon={<Unlock size={14} />}
            label="Mở lại kỳ"
            onClick={() => setConfirmReopen(true)}
            disabled={reopenPeriod.isPending}
          />
        )}
        <WinToolbar.Button icon={<FileSpreadsheet size={14} />} label="Xuất Excel" onClick={handleExport} disabled={!data || isLoading} />
      </WinToolbar>

      <div className="px-3 py-1.5 border-b border-win-grid-border text-win-base text-win-text-secondary shrink-0">
        {data ? (
          <span>
            {data.settings.companyName ?? '—'} · MST: {data.settings.taxCode ?? '—'} · {data.period.label} ·{' '}
            {isVat ? 'VAT khấu trừ' : 'Hộ kinh doanh'}
            {closed && <span className="ml-1 font-semibold text-win-active-title"> · Đã chốt</span>}
          </span>
        ) : (
          <span>Tổng hợp thuế kỳ để lập tờ khai</span>
        )}
      </div>

      {/* Cảnh báo đơn chưa tính thuế (VAT khấu trừ). */}
      {unsnapshotted > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 border-b border-yellow-400 text-win-base text-yellow-900 shrink-0">
          <AlertTriangle size={14} />
          <span>
            Có {unsnapshotted} đơn chưa tính thuế — bấm "Tính lại" ở trang Doanh thu theo thuế suất. Không thể chốt kỳ khi còn đơn chưa tính.
          </span>
        </div>
      )}

      {/* Ghi chú miễn thuế (hộ kinh doanh). */}
      {belowThreshold && (
        <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-300 text-win-base text-blue-900 shrink-0">
          Doanh thu luỹ kế năm chưa vượt ngưỡng miễn thuế — thuế GTGT/TNCN kỳ này = 0.
        </div>
      )}

      {/* Ô nhập thuế kỳ trước chuyển sang — chỉ chế độ VAT khấu trừ, khi kỳ chưa chốt. */}
      {isVat && !closed && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-win-grid-border text-win-base shrink-0">
          <div className="w-96">
            <WinInput
              label="Thuế kỳ trước chuyển sang"
              type="number"
              min={0}
              placeholder="Tự lấy từ kỳ trước"
              value={carriedForwardInput}
              onChange={(e) => setCarriedForwardInput(e.target.value)}
            />
          </div>
          <span className="text-win-text-secondary">(để trống ⇒ lấy số kết chuyển của kỳ đã chốt liền trước)</span>
        </div>
      )}

      <WinDataGrid columns={metricColumns} data={metrics} loading={isLoading} getRowClass={rowClass} />

      <div className="px-3 py-1.5 border-t border-win-grid-border text-win-base text-win-text-secondary shrink-0">{DISCLAIMER}</div>

      <WinMessageBox
        type="question"
        title="Chốt kỳ thuế"
        message={`Chốt kỳ ${data?.period.label ?? period}? Số liệu sẽ được lưu cố định; sửa phiếu/đơn sau đó không làm đổi số của kỳ đã chốt (có thể mở lại để tính lại).`}
        open={confirmClose}
        buttons="yes_no"
        onResult={(r) => {
          if (r === 'yes') closePeriod.mutate({ period, carriedForward })
          setConfirmClose(false)
        }}
      />

      <WinMessageBox
        type="warning"
        title="Mở lại kỳ"
        message={`Mở lại kỳ ${data?.period.label ?? period}? Số liệu sẽ được tính lại động theo dữ liệu hiện tại, snapshot đã chốt sẽ bị xoá.`}
        open={confirmReopen}
        buttons="yes_no"
        onResult={(r) => {
          if (r === 'yes') reopenPeriod.mutate(period)
          setConfirmReopen(false)
        }}
      />
    </div>
  )
}

/** Xuất Excel tổng hợp thuế kỳ theo chế độ. */
async function exportSummaryExcel(data: TaxSummaryResult): Promise<void> {
  const headerLines = [
    `Người nộp thuế: ${data.settings.companyName ?? '—'}`,
    `Mã số thuế: ${data.settings.taxCode ?? '—'}`,
    `Kỳ: ${data.period.label}`,
    `Chế độ: ${data.regime === 'VAT_DEDUCTION' ? 'VAT khấu trừ' : 'Hộ kinh doanh'}`,
    DISCLAIMER,
  ]

  if (data.regime === 'VAT_DEDUCTION') {
    const rows: (string | number | null)[][] = [
      ...data.output.byRate.map((g) => [`Đầu ra ${vatLabel(g.vatRate)}`, g.amountBeforeTax, g.vatAmount]),
      ...data.input.byRate.map((g) => [`Đầu vào ${vatLabel(g.vatRate)}`, g.amountBeforeTax, g.vatAmount]),
      ['Cộng đầu ra', data.output.totalBeforeTax, data.output.totalVat],
      ['Cộng đầu vào', data.input.totalBeforeTax, data.input.totalVat],
      ['Thuế kỳ trước chuyển sang', null, data.carriedForwardIn],
      ['Thuế GTGT phải nộp kỳ này', null, data.payable],
      ['Thuế còn được khấu trừ chuyển kỳ sau', null, data.carryToNext],
    ]
    await exportSheet({
      fileName: `TongHopThue_VAT_${data.period.value}.xlsx`,
      title: 'TỔNG HỢP THUẾ GTGT KỲ (KHẤU TRỪ)',
      headerLines,
      columns: [
        { header: 'Chỉ tiêu', width: 40 },
        { header: 'Chưa thuế', width: 18, align: 'right' },
        { header: 'Thuế GTGT', width: 18, align: 'right' },
      ],
      rows,
    })
    return
  }

  const rows: (string | number | null)[][] = [
    ['Doanh thu trong kỳ', data.revenue],
    ['Doanh thu luỹ kế từ đầu năm', data.yearToDateRevenue],
    ['Ngưỡng doanh thu miễn thuế/năm', data.exemptThreshold],
    [`Thuế GTGT (${data.vatPercent}%)`, data.vat],
    [`Thuế TNCN (${data.pitPercent}%)`, data.pit],
  ]
  await exportSheet({
    fileName: `TongHopThue_Ho_${data.period.value}.xlsx`,
    title: 'TỔNG HỢP THUẾ HỘ KINH DOANH KỲ',
    headerLines,
    columns: [
      { header: 'Chỉ tiêu', width: 40 },
      { header: 'Số tiền (đồng)', width: 20, align: 'right' },
    ],
    rows,
  })
}
