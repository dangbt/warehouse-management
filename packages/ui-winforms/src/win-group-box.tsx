import type { ReactNode } from 'react'

export function WinGroupBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border border-win-grid-border p-3 pt-4 relative my-2">
      <legend className="px-1.5 text-xs font-semibold text-win-text">{title}</legend>
      {children}
    </fieldset>
  )
}
