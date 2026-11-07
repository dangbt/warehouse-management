import { useState } from 'react'
import { WinToolbar } from '@wms/ui-winforms'
import { periodRange, type PeriodKind } from './inventory-summary-utils'

const KIND_LABEL: Record<PeriodKind, string> = { month: 'Tháng', quarter: 'Quý', year: 'Năm', custom: 'Tuỳ chọn' }

export interface PeriodState {
  range: { from: string; to: string }
  valid: boolean
  kind: PeriodKind
  year: number
  month: number
  quarter: number
  customFrom: string
  customTo: string
  setKind: (k: PeriodKind) => void
  setYear: (y: number) => void
  setMonth: (m: number) => void
  setQuarter: (q: number) => void
  setCustomFrom: (v: string) => void
  setCustomTo: (v: string) => void
}

/** State chọn kỳ báo cáo (tháng/quý/năm/tuỳ chọn). `initial` (tuỳ chọn) mở thẳng ở kỳ tuỳ chọn đó. */
export function usePeriod(initial?: { from: string; to: string }): PeriodState {
  const today = new Date()
  const [kind, setKind] = useState<PeriodKind>(initial ? 'custom' : 'month')
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [quarter, setQuarter] = useState(Math.floor(today.getMonth() / 3) + 1)
  const def = periodRange('month', year, month)
  const [customFrom, setCustomFrom] = useState(initial?.from ?? def.from)
  const [customTo, setCustomTo] = useState(initial?.to ?? def.to)
  const range = kind === 'custom' ? { from: customFrom, to: customTo } : periodRange(kind, year, kind === 'month' ? month : quarter)
  const valid = !!range.from && !!range.to && range.from <= range.to
  return { range, valid, kind, year, month, quarter, customFrom, customTo, setKind, setYear, setMonth, setQuarter, setCustomFrom, setCustomTo }
}

export function PeriodPicker({ p }: { p: PeriodState }) {
  return (
    <>
      <select className="text-win-base" value={p.kind} onChange={(e) => p.setKind(e.target.value as PeriodKind)}>
        {(Object.keys(KIND_LABEL) as PeriodKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
      </select>
      {p.kind === 'month' && (
        <select className="text-win-base" value={p.month} onChange={(e) => p.setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
        </select>
      )}
      {p.kind === 'quarter' && (
        <select className="text-win-base" value={p.quarter} onChange={(e) => p.setQuarter(Number(e.target.value))}>
          {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Quý {q}</option>)}
        </select>
      )}
      {p.kind !== 'custom' ? (
        <input type="number" className="text-win-base w-20" value={p.year} onChange={(e) => p.setYear(Number(e.target.value) || p.year)} />
      ) : (
        <>
          <input type="date" className="text-win-base" value={p.customFrom} onChange={(e) => p.setCustomFrom(e.target.value)} />
          <span>–</span>
          <input type="date" className="text-win-base" value={p.customTo} onChange={(e) => p.setCustomTo(e.target.value)} />
        </>
      )}
      <WinToolbar.Separator />
    </>
  )
}
