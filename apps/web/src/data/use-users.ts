import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

interface UserRow { id: string; fullName: string; email: string; department: { name: string } | null; departmentId: string; userRoles: { role: { id: string; name: string } }[]; isActive: boolean; phone?: string }
interface ListResponse { data: UserRow[]; meta: { page: number; limit: number; total: number } }

export function useUsers() {
  return useQuery<ListResponse>({ queryKey: QUERY_KEYS.usersList(), queryFn: () => api.get('/users?limit=50') })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; full_name: string; phone?: string; department_id: string; role_ids: string[]; password?: string }) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.users }) },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; full_name?: string; phone?: string; department_id?: string }) => api.put(`/users/${id}`, data),
    onSuccess: (updated) => {
      qc.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.users }, (old) => old ? { ...old, data: old.data.map((u) => u.id === updated.id ? { ...u, ...updated } : u) } : old)
    },
  })
}

export function useToggleUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put(`/users/${id}/toggle-active`, {}),
    onSuccess: (updated) => {
      qc.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.users }, (old) => old ? { ...old, data: old.data.map((u) => u.id === updated.id ? { ...u, isActive: updated.isActive } : u) } : old)
    },
  })
}
