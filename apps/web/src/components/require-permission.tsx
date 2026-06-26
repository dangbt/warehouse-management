import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth.store'

export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  if (!hasPermission(permission)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 border border-win-grid-border rounded bg-win-control">
          <div className="text-2xl mb-2">🚫</div>
          <h2 className="text-sm font-bold mb-1">Không có quyền truy cập</h2>
          <p className="text-[11px] text-win-text-secondary">Bạn không có quyền xem trang này. Vui lòng liên hệ quản trị viên.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
