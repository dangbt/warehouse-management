import type { ReactNode } from 'react'

export function WinStatusBar({ children }: { children: ReactNode }) {
  return <div className="h-6 bg-win-statusbar text-white flex items-center text-[11px] shrink-0">{children}</div>
}

WinStatusBar.Section = function Section({ children }: { children: ReactNode }) {
  return <div className="px-3 border-r border-white/30 whitespace-nowrap">{children}</div>
}
