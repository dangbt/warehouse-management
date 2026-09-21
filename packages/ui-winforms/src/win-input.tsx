import { forwardRef } from 'react'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const WinInput = forwardRef<HTMLInputElement, Props>(({ label, error, placeholder, ...props }, ref) => (
  <div className="flex items-center gap-2">
    <label className="text-win-base w-30 text-right shrink-0">{label}:</label>
    <div className="flex-1">
      <input
        ref={ref}
        data-testid={`input-${label}`}
        placeholder={placeholder ?? `Nhập ${label.toLowerCase()}`}
        {...props}
        className={`w-full h-8 border px-2 text-win-base outline-none focus:border-win-input-focus bg-white ${error ? 'border-win-error' : 'border-win-input-border'}`}
      />
      {error && <p className="text-win-xs text-win-error mt-0.5">{error}</p>}
    </div>
  </div>
))
