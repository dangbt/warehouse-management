import { AlertTriangle, Info, AlertCircle, HelpCircle } from 'lucide-react'

interface Props {
  type: 'info' | 'warning' | 'error' | 'question'
  title: string
  message: string
  open: boolean
  onResult: (result: 'yes' | 'no' | 'ok' | 'cancel') => void
  buttons?: 'ok' | 'ok_cancel' | 'yes_no'
}

const icons = {
  info: <Info size={32} className="text-win-active-title" />,
  warning: <AlertTriangle size={32} className="text-win-warning" />,
  error: <AlertCircle size={32} className="text-win-error" />,
  question: <HelpCircle size={32} className="text-win-active-title" />,
}

export function WinMessageBox({ type, title, message, open, onResult, buttons = 'ok' }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-win-control border border-win-grid-border shadow-lg w-[360px]">
        <div className="px-3 py-2 bg-white border-b border-win-grid-border text-[13px] font-semibold">{title}</div>
        <div className="flex gap-3 p-4 items-start">
          {icons[type]}
          <p className="text-xs pt-1">{message}</p>
        </div>
        <div className="flex justify-end gap-2 px-3 py-2 border-t border-win-grid-border">
          {buttons === 'ok' && <Btn label="OK" onClick={() => onResult('ok')} primary />}
          {buttons === 'ok_cancel' && (
            <>
              <Btn label="OK" onClick={() => onResult('ok')} primary />
              <Btn label="Cancel" onClick={() => onResult('cancel')} />
            </>
          )}
          {buttons === 'yes_no' && (
            <>
              <Btn label="Yes" onClick={() => onResult('yes')} primary />
              <Btn label="No" onClick={() => onResult('no')} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Btn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1 text-xs border min-w-[75px] cursor-pointer
        ${primary ? 'bg-win-active-title text-white border-win-active-title' : 'bg-win-button border-win-button-border hover:bg-win-button-hover'}`}
    >
      {label}
    </button>
  )
}
