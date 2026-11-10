import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'

export interface Branding {
  name: string
  shortName: string
  logoUrl: string
  primaryColor: string | null
}

/** Mặc định = Kho Việt: hiển thị khi chưa tải xong / API chưa có cấu hình. */
export const DEFAULT_BRANDING: Branding = { name: 'Kho Việt', shortName: 'KV', logoUrl: '/logo.svg', primaryColor: null }

export const BRANDING_KEY = ['settings', 'branding'] as const

export function useBranding(): Branding {
  const q = useQuery<Branding>(
    { queryKey: BRANDING_KEY, queryFn: () => api.get('/settings/branding'), staleTime: 10 * 60 * 1000 },
    queryClient,
  )
  return q.data ?? DEFAULT_BRANDING
}

/** Áp tên tab + màu chủ đạo (ghi đè biến theme) lên document. */
export function useApplyBranding(): Branding {
  const b = useBranding()
  useEffect(() => {
    document.title = `${b.name} - Quản Lý Kho`
    const root = document.documentElement.style
    if (b.primaryColor) {
      root.setProperty('--color-win-active-title', b.primaryColor)
      root.setProperty('--color-win-input-focus', b.primaryColor)
    } else {
      root.removeProperty('--color-win-active-title')
      root.removeProperty('--color-win-input-focus')
    }
  }, [b])
  return b
}
