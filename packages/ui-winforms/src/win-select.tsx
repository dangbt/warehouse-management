import { forwardRef } from 'react'

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string; label: string }[]
}

export const WinSelect = forwardRef<HTMLSelectElement, Props>(({ label, error, options, ...props }, ref) => (
  <div className="flex items-start gap-2">
    <label className="text-[11px] w-24 text-right shrink-0 pt-1">{label}:</label>
    <div className="flex-1">
      <select
        ref={ref}
        data-testid={`select-${label}`}
        {...props}
        className={`w-full border px-2 py-0.5 text-[11px] rounded-sm outline-none focus:border-win-input-focus bg-white ${error ? 'border-win-error' : 'border-win-input-border'}`}
      >
        <option value="">-- Chọn --</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[10px] text-win-error mt-0.5">{error}</p>}
    </div>
  </div>
))
