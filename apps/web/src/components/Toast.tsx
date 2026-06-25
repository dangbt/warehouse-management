import { CheckCircle, XCircle, X } from 'lucide-react'
import { useToastStore } from '@/stores/toast.store'

export function ToastContainer() {
  const { toasts, remove } = useToastStore()
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-2 right-2 z-[100] flex flex-col gap-1.5 max-w-[320px]">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded shadow-lg border text-[11px] animate-[slideIn_0.2s_ease] ${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {t.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="opacity-50 hover:opacity-100 cursor-pointer"><X size={12} /></button>
        </div>
      ))}
    </div>
  )
}
