import type { ReactNode } from 'react'

interface ToolbarButtonProps {
  icon?: ReactNode
  label?: string
  onClick?: () => void
  disabled?: boolean
}

function Button({ icon, label, onClick, disabled }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 px-2 py-1 border border-transparent rounded-sm text-[11px] cursor-pointer hover:bg-win-menu-hover hover:border-win-button-border disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  )
}

function Separator() {
  return <div className="w-px h-5 bg-win-grid-border mx-1" />
}

export function WinToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="h-9 bg-win-menu border-b border-win-grid-border flex items-center px-1 gap-0.5 shrink-0">
      {children}
    </div>
  )
}

WinToolbar.Button = Button
WinToolbar.Separator = Separator
