import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

interface Role { id: string; name: string; code: string; description?: string; permissions: { id: string; resource: string; action: string }[] }

export function useRoles() {
  return useQuery<Role[]>({ queryKey: QUERY_KEYS.rolesList(), queryFn: () => api.get('/roles') })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; code: string; description?: string }) => api.post('/roles', data),
    onSuccess: (newItem) => {
      qc.setQueriesData<Role[]>({ queryKey: QUERY_KEYS.roles }, (old) => old ? [...old, { ...newItem, permissions: [] }] : old)
    },
  })
}

export function useUpdateRolePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: { resource: string; action: string }[] }) => api.put(`/roles/${id}/permissions`, { permissions }),
    onSuccess: (updated) => {
      qc.setQueriesData<Role[]>({ queryKey: QUERY_KEYS.roles }, (old) => old ? old.map((r) => r.id === updated.id ? updated : r) : old)
    },
  })
}
