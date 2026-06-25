import { useNavigate } from '@tanstack/react-router'
import { FileQuestion } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="h-screen flex items-center justify-center bg-win-control">
      <div className="text-center">
        <FileQuestion size={64} className="mx-auto text-win-text-secondary mb-4" />
        <h1 className="text-2xl font-bold text-win-text mb-1">404</h1>
        <p className="text-sm text-win-text-secondary mb-4">Trang bạn tìm không tồn tại</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => navigate({ to: '/dashboard' })} className="px-4 py-1.5 text-xs bg-win-active-title text-white border border-win-active-title rounded-sm cursor-pointer">
            Về Dashboard
          </button>
          <button onClick={() => window.history.back()} className="px-4 py-1.5 text-xs bg-win-button border border-win-button-border rounded-sm cursor-pointer hover:bg-win-button-hover">
            Quay lại
          </button>
        </div>
      </div>
    </div>
  )
}
