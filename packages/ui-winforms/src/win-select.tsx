import { forwardRef } from 'react'

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string; label: string }[]
}

export const WinSelect = forwardRef<HTMLSelectElement, Props>(({ label, error, options, ...props }, ref) => (
  <div className="flex items-center gap-2">
    <label className="text-win-base w-30 text-right shrink-0">{label}:</label>
    <div className="flex-1">
      <select
        ref={ref}
        data-testid={`select-${label}`}
        {...props}
        className={`w-full h-8 border px-2 text-win-base outline-none focus:border-win-input-focus bg-white ${error ? 'border-win-error' : 'border-win-input-border'}`}
      >
        <option value="">-- Chọn --</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-win-xs text-win-error mt-0.5">{error}</p>}
    </div>
  </div>
))
