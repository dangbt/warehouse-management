import type { ReactNode } from 'react'

export function WinGroupBox({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="border border-win-grid-border p-3 pt-4 relative my-2">
      <legend className="px-1.5 text-win-base font-semibold text-win-text">
        <span className="inline-flex items-center gap-1.5">
          {icon && <span className="flex items-center text-win-active-title">{icon}</span>}
          {title}
        </span>
      </legend>
      {children}
    </fieldset>
  )
}
