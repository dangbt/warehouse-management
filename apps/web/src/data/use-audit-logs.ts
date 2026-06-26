import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

interface AuditLog {
  id: string
  user: { fullName: string } | null
  action: string
  resource: string
  resourceId: string
  oldValues: unknown
  newValues: unknown
  ipAddress: string
  createdAt: string
}
interface ListResponse {
  data: AuditLog[]
  meta: { page: number; limit: number; total: number }
}

export function useAuditLogs(params?: { user_id?: string; action?: string; resource?: string }) {
  const query = new URLSearchParams({ limit: '100' })
  if (params?.user_id) query.set('user_id', params.user_id)
  if (params?.action) query.set('action', params.action)
  if (params?.resource) query.set('resource', params.resource)

  return useQuery<ListResponse>({
    queryKey: QUERY_KEYS.auditLogsList(params as Record<string, string>),
    queryFn: () => api.get(`/audit-logs?${query}`),
  })
}
