import { forwardRef } from 'react'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const WinInput = forwardRef<HTMLInputElement, Props>(({ label, error, ...props }, ref) => (
  <div className="flex items-start gap-2">
    <label className="text-[11px] w-24 text-right shrink-0 pt-1">{label}:</label>
    <div className="flex-1">
      <input ref={ref} data-testid={`input-${label}`} {...props} className={`w-full border px-2 py-0.5 text-[11px] rounded-sm outline-none focus:border-win-input-focus ${error ? 'border-win-error' : 'border-win-input-border'}`} />
      {error && <p className="text-[10px] text-win-error mt-0.5">{error}</p>}
    </div>
  </div>
))
