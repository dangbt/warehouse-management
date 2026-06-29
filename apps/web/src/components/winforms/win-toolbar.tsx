import type { ReactNode } from 'react'

interface ToolbarButtonProps {
  icon?: ReactNode
  label?: string
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
  active?: boolean
}

function Button({ icon, label, onClick, disabled, danger, active }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={label ? `toolbar-${label}` : undefined}
      className={`flex items-center gap-1 px-2 py-1 border text-[11px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${active ? 'bg-win-active-title text-white border-win-active-title' : danger ? 'border-transparent text-win-error hover:bg-red-50 hover:border-win-error/40' : 'border-transparent hover:bg-win-menu-hover hover:border-win-button-border'}`}
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
