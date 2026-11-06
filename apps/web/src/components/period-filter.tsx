import { PERIOD_OPTIONS } from '@/utils/period'

export interface PeriodValue {
  period: string
  from: string
  to: string
}

interface Props extends PeriodValue {
  onChange: (next: PeriodValue) => void
}

/** Bộ lọc kỳ dùng chung cho danh sách chứng từ; giá trị do trang giữ trên URL search params. */
export function PeriodFilter({ period, from, to, onChange }: Props) {
  const inputCls = 'border border-win-input-border h-8 px-2 text-win-base outline-none bg-white'
  return (
    <div className="inline-flex items-center gap-1" data-testid="period-filter">
      <select
        data-testid="period-select"
        value={period}
        onChange={(e) => onChange({ period: e.target.value, from: '', to: '' })}
        className={inputCls}
        title="Kỳ (theo ngày chứng từ)"
      >
        {PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {period === 'custom' && (
        <>
          <input
            type="date"
            data-testid="period-from"
            value={from}
            max={to || undefined}
            onChange={(e) => onChange({ period, from: e.target.value, to })}
            className={inputCls}
          />
          <span>–</span>
          <input
            type="date"
            data-testid="period-to"
            value={to}
            min={from || undefined}
            onChange={(e) => onChange({ period, from, to: e.target.value })}
            className={inputCls}
          />
        </>
      )}
    </div>
  )
}
