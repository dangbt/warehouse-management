import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export interface SupplierPayment {
  id: string
  supplierId: string
  amount: string
  method: 'CASH' | 'TRANSFER'
  note: string | null
  createdAt: string
  createdBy: { fullName: string }
}

export function useSupplierPayments(supplierId: string | undefined) {
  return useQuery<SupplierPayment[]>({
    queryKey: QUERY_KEYS.supplierPaymentsList(supplierId ?? ''),
    queryFn: () => api.get(`/supplier-payments?supplierId=${supplierId}`),
    enabled: !!supplierId,
  })
}

export function useCreateSupplierPayment() {
  return useMutation({
    mutationFn: (data: { supplierId: string; amount: number; method: 'CASH' | 'TRANSFER'; note?: string }) =>
      api.post('/supplier-payments', data),
    onSuccess: (_newItem, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.supplierPaymentsList(variables.supplierId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers })
      useToastStore.getState().success('Thanh toán thành công')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}
