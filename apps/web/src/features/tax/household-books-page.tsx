import { useMemo, useState } from 'react'
import { RefreshCw, FileSpreadsheet } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinSelect } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { formatNumber } from '@wms/shared'
import { useRevenueBook, useMaterialsBook, useIngredients } from '@/data'
import type { RevenueBookReport, MaterialsBookReport } from '@/data'
import { exportSheet, exportMultiSheet } from '@/utils/excel'
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

/** Số lượng: tối đa 3 chữ số thập phân, bỏ số 0 thừa. */
function fmtQty(n: number): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
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

// ---------------------------------------------------------------------------
// Tab S1: Sổ doanh thu
// ---------------------------------------------------------------------------

interface RevenueFlatRow {
  id: string
  kind: 'data' | 'total' | 'tax'
  date?: string
  description?: string
  amount?: number
}

function flattenRevenue(report: RevenueBookReport): RevenueFlatRow[] {
  const rows: RevenueFlatRow[] = report.rows.map((r, i) => ({
    id: `r-${i}`,
    kind: 'data' as const,
    date: r.date,
    description: r.description,
    amount: r.amount,
  }))
  rows.push({ id: 'total', kind: 'total', description: 'TỔNG CỘNG DOANH THU', amount: report.total.amount })
  if (report.tax.regime === 'HOUSEHOLD') {
    rows.push({ id: 'tax-vat', kind: 'tax', description: 'Thuế GTGT phải nộp', amount: report.tax.vat })
    rows.push({ id: 'tax-pit', kind: 'tax', description: 'Thuế TNCN phải nộp', amount: report.tax.pit })
  }
  return rows
}

const revenueColumns: Column<RevenueFlatRow>[] = [
  {
    key: 'date',
    header: 'Ngày',
    width: 110,
    align: 'center',
    render: (r) => (r.kind === 'data' ? fmtDate(r.date ?? null) : ''),
  },
  {
    key: 'description',
    header: 'Diễn giải',
    width: 320,
    render: (r) => (r.kind === 'data' ? (r.description ?? '') : <span className="font-semibold">{r.description}</span>),
  },
  {
    key: 'amount',
    header: 'Doanh thu',
    width: 160,
    align: 'right',
    render: (r) => (r.amount != null ? formatNumber(r.amount) : ''),
  },
]

function revenueRowClass(r: RevenueFlatRow): string {
  if (r.kind === 'total') return 'bg-win-active-title/10 font-bold'
  if (r.kind === 'tax') return 'bg-win-control font-semibold'
  return ''
}

// ---------------------------------------------------------------------------
// Tab S2: Sổ vật liệu, hàng hoá
// ---------------------------------------------------------------------------

interface MaterialFlatRow {
  id: string
  kind: 'ingredientHeader' | 'opening' | 'data' | 'closing'
  label?: string
  stt?: number
  date?: string
  document?: string
  description?: string
  inQuantity?: number
  inValue?: number
  outQuantity?: number
  outValue?: number
}

function flattenMaterials(report: MaterialsBookReport): MaterialFlatRow[] {
  const rows: MaterialFlatRow[] = []
  for (const entry of report.entries) {
    rows.push({
      id: `h-${entry.ingredientId}`,
      kind: 'ingredientHeader',
      label: `${entry.ingredientName} (ĐVT: ${entry.unit})`,
    })
    rows.push({
      id: `o-${entry.ingredientId}`,
      kind: 'opening',
      label: 'Tồn đầu kỳ',
      inQuantity: entry.opening.quantity,
      inValue: entry.opening.value,
    })
    entry.rows.forEach((r) => {
      rows.push({
        id: `d-${entry.ingredientId}-${r.stt}`,
        kind: 'data',
        stt: r.stt,
        date: r.date,
        document: r.document,
        description: r.description,
        inQuantity: r.inQuantity,
        inValue: r.inValue,
        outQuantity: r.outQuantity,
        outValue: r.outValue,
      })
    })
    rows.push({
      id: `c-${entry.ingredientId}`,
      kind: 'closing',
      label: 'Tồn cuối kỳ',
      inQuantity: entry.closing.quantity,
      inValue: entry.closing.value,
    })
  }
  return rows
}

const materialColumns: Column<MaterialFlatRow>[] = [
  { key: 'stt', header: 'STT', width: 44, align: 'center', render: (r) => (r.kind === 'data' ? r.stt : '') },
  { key: 'date', header: 'Ngày', width: 92, align: 'center', render: (r) => (r.kind === 'data' ? fmtDate(r.date ?? null) : '') },
  {
    key: 'document',
    header: 'Chứng từ / Diễn giải',
    width: 240,
    render: (r) => {
      if (r.kind === 'ingredientHeader') return <span className="font-semibold">{r.label}</span>
      if (r.kind === 'opening' || r.kind === 'closing') return <span className="font-semibold">{r.label}</span>
      return r.description || r.document || ''
    },
  },
  {
    key: 'inQuantity',
    header: 'Nhập / Tồn SL',
    width: 100,
    align: 'right',
    render: (r) => {
      if (r.kind === 'opening' || r.kind === 'closing') return fmtQty(r.inQuantity ?? 0)
      if (r.kind === 'data' && r.inQuantity) return fmtQty(r.inQuantity)
      return ''
    },
  },
  {
    key: 'inValue',
    header: 'Nhập / Tồn giá trị',
    width: 130,
    align: 'right',
    render: (r) => {
      if (r.kind === 'opening' || r.kind === 'closing') return formatNumber(r.inValue ?? 0)
      if (r.kind === 'data' && r.inValue) return formatNumber(r.inValue)
      return ''
    },
  },
  { key: 'outQuantity', header: 'Xuất SL', width: 90, align: 'right', render: (r) => (r.kind === 'data' && r.outQuantity ? fmtQty(r.outQuantity) : '') },
  { key: 'outValue', header: 'Xuất giá trị', width: 120, align: 'right', render: (r) => (r.kind === 'data' && r.outValue ? formatNumber(r.outValue) : '') },
]

function materialRowClass(r: MaterialFlatRow): string {
  if (r.kind === 'ingredientHeader') return 'bg-win-grid-header font-semibold'
  if (r.kind === 'opening') return 'bg-win-control'
  if (r.kind === 'closing') return 'bg-win-active-title/10 font-semibold'
  return ''
}

// ---------------------------------------------------------------------------
// Trang chính
// ---------------------------------------------------------------------------

export function HouseholdBooksPage() {
  const [tab, setTab] = useState<'S1' | 'S2'>('S1')
  const [periodType, setPeriodType] = useState<'MONTH' | 'QUARTER'>('QUARTER')
  const periodOptions = useMemo(() => buildPeriodOptions(periodType), [periodType])
  const [period, setPeriod] = useState<string>(() => buildPeriodOptions('QUARTER')[0].value)
  const [ingredientId, setIngredientId] = useState<string>('')

  const toast = useToastStore()

  const revenue = useRevenueBook(tab === 'S1' ? period : undefined)
  const materials = useMaterialsBook(tab === 'S2' ? period : undefined, ingredientId || undefined)
  const ingredientsQuery = useIngredients({ limit: 1000 })

  const ingredientOptions = useMemo(() => {
    const opts = [{ value: '', label: 'Tất cả nguyên liệu' }]
    for (const i of ingredientsQuery.data?.data ?? []) opts.push({ value: i.id, label: i.name })
    return opts
  }, [ingredientsQuery.data])

  const revenueRows = useMemo(() => (revenue.data ? flattenRevenue(revenue.data) : []), [revenue.data])
  const materialRows = useMemo(() => (materials.data ? flattenMaterials(materials.data) : []), [materials.data])

  const changePeriodType = (t: 'MONTH' | 'QUARTER') => {
    setPeriodType(t)
    setPeriod(buildPeriodOptions(t)[0].value)
  }

  const isLoading = tab === 'S1' ? revenue.isLoading : materials.isLoading
  const refetch = () => (tab === 'S1' ? revenue.refetch() : materials.refetch())
  const settings = tab === 'S1' ? revenue.data?.settings : materials.data?.settings

  const handleExport = async () => {
    try {
      if (tab === 'S1') {
        const data = revenue.data
        if (!data) return
        const headerLines = [
          `Tên hộ kinh doanh: ${data.settings.companyName ?? '—'}`,
          `Mã số thuế: ${data.settings.taxCode ?? '—'}`,
          `Kỳ: ${data.period.label}`,
        ]
        const rows: (string | number | null)[][] = data.rows.map((r) => [fmtDate(r.date), r.description, r.amount])
        const totalRow: (string | number | null)[] = ['', 'TỔNG CỘNG DOANH THU', data.total.amount]
        await exportSheet({
          fileName: `S1-HKD_SoDoanhThu_${data.period.value}.xlsx`,
          title: 'SỔ CHI TIẾT DOANH THU BÁN HÀNG HOÁ, DỊCH VỤ (S1-HKD)',
          headerLines,
          columns: [
            { header: 'Ngày', width: 12, align: 'center' },
            { header: 'Diễn giải', width: 46 },
            { header: 'Doanh thu', width: 18, align: 'right' },
          ],
          rows: [
            ...rows,
            ...(data.tax.regime === 'HOUSEHOLD'
              ? [
                  ['', 'Thuế GTGT phải nộp', data.tax.vat] as (string | number | null)[],
                  ['', 'Thuế TNCN phải nộp', data.tax.pit] as (string | number | null)[],
                ]
              : []),
          ],
          totalRow,
        })
      } else {
        const data = materials.data
        if (!data) return
        const headerLines = [
          `Tên hộ kinh doanh: ${data.settings.companyName ?? '—'}`,
          `Mã số thuế: ${data.settings.taxCode ?? '—'}`,
          `Kỳ: ${data.period.label}`,
        ]
        const columns = [
          { header: 'STT', width: 6, align: 'center' as const },
          { header: 'Ngày', width: 12, align: 'center' as const },
          { header: 'Chứng từ / Diễn giải', width: 34 },
          { header: 'Nhập SL', width: 12, align: 'right' as const },
          { header: 'Nhập giá trị', width: 16, align: 'right' as const },
          { header: 'Xuất SL', width: 12, align: 'right' as const },
          { header: 'Xuất giá trị', width: 16, align: 'right' as const },
        ]
        // Mỗi nguyên liệu một sheet (đơn giản, dễ tra cứu).
        const sheets = data.entries.map((entry) => {
          const rows: (string | number | null)[][] = [['', '', 'Tồn đầu kỳ', entry.opening.quantity, entry.opening.value, '', '']]
          for (const r of entry.rows) {
            rows.push([r.stt, fmtDate(r.date), r.description || r.document, r.inQuantity || '', r.inValue || '', r.outQuantity || '', r.outValue || ''])
          }
          rows.push(['', '', 'Tồn cuối kỳ', entry.closing.quantity, entry.closing.value, '', ''])
          return {
            // Tên sheet Excel tối đa 31 ký tự, không chứa ký tự đặc biệt.
            name: entry.ingredientName.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'NL',
            title: `SỔ CHI TIẾT VẬT LIỆU, HÀNG HOÁ (S2-HKD) — ${entry.ingredientName} (ĐVT: ${entry.unit})`,
            headerLines,
            columns,
            rows,
          }
        })
        if (sheets.length === 0) {
          toast.error('Không có dữ liệu để xuất')
          return
        }
        await exportMultiSheet({ fileName: `S2-HKD_SoVatLieu_${data.period.value}.xlsx`, sheets })
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không xuất được Excel')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button label="Sổ doanh thu (S1)" active={tab === 'S1'} onClick={() => setTab('S1')} />
        <WinToolbar.Button label="Sổ vật liệu (S2)" active={tab === 'S2'} onClick={() => setTab('S2')} />
        <WinToolbar.Separator />
        <WinToolbar.Button label="Tháng" active={periodType === 'MONTH'} onClick={() => changePeriodType('MONTH')} />
        <WinToolbar.Button label="Quý" active={periodType === 'QUARTER'} onClick={() => changePeriodType('QUARTER')} />
        <WinToolbar.Separator />
        <div className="w-40 px-1">
          <WinSelect options={periodOptions} value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        {tab === 'S2' && (
          <div className="w-52 px-1">
            <WinSelect options={ingredientOptions} value={ingredientId} onChange={(e) => setIngredientId(e.target.value)} />
          </div>
        )}
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Làm mới" onClick={() => refetch()} />
        <WinToolbar.Button icon={<FileSpreadsheet size={14} />} label="Xuất Excel" onClick={handleExport} disabled={isLoading} />
      </WinToolbar>

      <div className="px-3 py-1.5 border-b border-win-grid-border text-win-base text-win-text-secondary shrink-0">
        {settings ? (
          <span>
            {settings.companyName ?? '—'} · MST: {settings.taxCode ?? '—'} · {period}
          </span>
        ) : (
          <span>Sổ kế toán hộ kinh doanh</span>
        )}
      </div>

      {tab === 'S1' ? (
        <WinDataGrid columns={revenueColumns} data={revenueRows} loading={revenue.isLoading} getRowClass={revenueRowClass} />
      ) : (
        <WinDataGrid columns={materialColumns} data={materialRows} loading={materials.isLoading} getRowClass={materialRowClass} />
      )}
    </div>
  )
}
