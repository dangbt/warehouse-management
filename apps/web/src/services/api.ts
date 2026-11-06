import { createApiClient } from '@wms/shared'
import { useAuthStore } from '@/stores/auth.store'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

export const api = createApiClient(
  API_BASE,
  () => useAuthStore.getState().token,
  () => {
    useAuthStore.getState().logout()
    window.location.href = '/login'
  },
)
