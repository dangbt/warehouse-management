import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

export function useHealth() {
  return useQuery<{ status: string }>({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    refetchInterval: 30_000,
    retry: false,
  })
}
