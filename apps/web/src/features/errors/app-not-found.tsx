import { useNavigate } from '@tanstack/react-router'
import { FileQuestion } from 'lucide-react'

export function AppNotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <FileQuestion size={48} className="mx-auto text-win-text-secondary mb-3" />
        <h2 className="text-lg font-bold text-win-text mb-1">404 - Không tìm thấy</h2>
        <p className="text-xs text-win-text-secondary mb-3">Trang này không tồn tại trong hệ thống</p>
        <button onClick={() => navigate({ to: '/dashboard' })} className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title rounded-sm cursor-pointer">
          Về Dashboard
        </button>
      </div>
    </div>
  )
}
