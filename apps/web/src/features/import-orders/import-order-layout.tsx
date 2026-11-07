import type { ReactNode } from 'react'

export const input = 'w-full h-10 border px-3 text-[14px] bg-white outline-none focus:border-win-input-focus disabled:bg-win-control'

/** Một dòng "nhãn: ô nhập" cỡ lớn, nhãn bên trái như chứng từ MISA. */
export function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <label className="w-[120px] shrink-0 pt-2.5 text-[14px] text-right">
        {label}
        {required && <span className="text-win-error"> *</span>}
      </label>
      <div className="flex-1 min-w-0">
        {children}
        {error && <p className="text-[12px] text-win-error mt-0.5">{error}</p>}
      </div>
    </div>
  )
}

export function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="border border-win-grid-border bg-white">
      <header className="flex items-center gap-2 px-3 h-10 border-b border-win-grid-border bg-win-grid-header">
        <span className="w-6 h-6 rounded-full bg-win-active-title text-white text-[13px] font-semibold flex items-center justify-center">
          {step}
        </span>
        <span className="text-[15px] font-semibold">{title}</span>
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}
