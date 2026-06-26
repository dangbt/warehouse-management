import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

export function useDepartments() {
  return useQuery<{ id: string; name: string; code: string }[]>({
    queryKey: QUERY_KEYS.departments,
    queryFn: () => api.get('/departments'),
    staleTime: Infinity,
  })
}

export function useMenuItems() {
  return useQuery<{ id: string; name: string; price: string; category: string }[]>({
    queryKey: QUERY_KEYS.menuItems,
    queryFn: () => api.get('/menu-items'),
    staleTime: Infinity,
  })
}
