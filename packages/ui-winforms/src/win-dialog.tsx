import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  open: boolean
  onClose: () => void
  width?: number
  footer?: ReactNode
  children: ReactNode
}

export function WinDialog({ title, open, onClose, width = 480, footer, children }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        data-testid="dialog"
        className="bg-win-control border border-win-grid-border shadow-lg max-h-[90vh] flex flex-col"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-win-grid-border shrink-0">
          <span className="text-[13px] font-semibold">{title}</span>
          <button onClick={onClose} className="p-0.5 hover:bg-win-menu-hover">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-3 py-2 border-t border-win-grid-border shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
