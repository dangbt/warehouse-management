import { createApiClient } from '@wms/shared'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Chọn base URL cho API:
 * - Nếu VITE_API_URL được đặt → dùng nó (ưu tiên cao nhất).
 * - Dev (Vite dev-server) → http://localhost:3000/api/v1.
 * - Production (Docker / static build) → '/api/v1' (same-origin, qua nginx proxy).
 */
export function resolveApiBase(viteApiUrl: string | undefined, isDev: boolean): string {
  if (viteApiUrl) return viteApiUrl
  return isDev ? 'http://localhost:3000/api/v1' : '/api/v1'
}

export const API_BASE = resolveApiBase(import.meta.env.VITE_API_URL, import.meta.env.DEV)

export const api = createApiClient(
  API_BASE,
  () => useAuthStore.getState().token,
  () => {
    useAuthStore.getState().logout()
    window.location.href = '/login'
  },
)
