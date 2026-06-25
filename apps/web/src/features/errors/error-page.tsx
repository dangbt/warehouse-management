import { AlertCircle } from 'lucide-react'

export function ErrorPage({ error }: { error?: Error }) {
  return (
    <div className="h-screen flex items-center justify-center bg-win-control">
      <div className="text-center max-w-md">
        <AlertCircle size={64} className="mx-auto text-win-error mb-4" />
        <h1 className="text-2xl font-bold text-win-text mb-1">500</h1>
        <p className="text-sm text-win-text-secondary mb-2">Đã xảy ra lỗi hệ thống</p>
        {error && (
          <pre className="text-[11px] text-left bg-win-grid-row-alt border border-win-grid-border p-3 rounded mb-4 overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          <button onClick={() => window.location.reload()} className="px-4 py-1.5 text-xs bg-win-active-title text-white border border-win-active-title rounded-sm cursor-pointer">
            Tải lại trang
          </button>
          <button onClick={() => window.history.back()} className="px-4 py-1.5 text-xs bg-win-button border border-win-button-border rounded-sm cursor-pointer hover:bg-win-button-hover">
            Quay lại
          </button>
        </div>
      </div>
    </div>
  )
}
