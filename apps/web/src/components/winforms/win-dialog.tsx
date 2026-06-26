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
        className="bg-win-control border border-win-grid-border rounded shadow-lg"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-win-grid-border">
          <span className="text-[13px] font-semibold">{title}</span>
          <button onClick={onClose} className="p-0.5 hover:bg-win-menu-hover rounded">
            <X size={14} />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-3 py-2 border-t border-win-grid-border">{footer}</div>}
      </div>
    </div>
  )
}
