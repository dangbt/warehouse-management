import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export interface MenuItemFull {
  id: string
  name: string
  price: string
  category: string
  isActive: boolean
  kiotvietProductId: string | null
  inventoryMode: 'RECIPE' | 'DIRECT' | 'NONE' | null
  directIngredientId: string | null
  directIngredient: { id: string; name: string; unit: string } | null
  recipe: { id: string; name: string; _count: { ingredients: number } } | null
}

type MenuPayload = {
  name?: string
  price?: number
  category?: string
  inventory_mode?: 'RECIPE' | 'DIRECT' | 'NONE' | null
  direct_ingredient_id?: string | null
  is_active?: boolean
}

export function useMenuList() {
  return useQuery<MenuItemFull[]>({
    queryKey: QUERY_KEYS.menuItems,
    queryFn: () => api.get('/menu-items'),
  })
}

export function useCreateMenuItem() {
  return useMutation({
    mutationFn: (data: { name: string; price: number; category: string }) => api.post('/menu-items', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems })
      useToastStore.getState().success('Thêm món thành công')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}

export function useUpdateMenuItem() {
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & MenuPayload) => api.put(`/menu-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.menuItems })
      useToastStore.getState().success('Cập nhật món thành công')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}
