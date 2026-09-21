import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'
import type { TaxRegime, TaxPeriodType, VatRate } from '@wms/shared'

export interface TaxSetting {
  id: string
  regime: TaxRegime
  companyName: string | null
  taxCode: string | null
  address: string | null
  periodType: TaxPeriodType
  defaultOutputVatRate: VatRate
  pricesIncludeVat: boolean
  householdVatPercent: string
  householdPitPercent: string
  householdExemptThreshold: string
  updatedAt: string
}

export interface UpdateTaxSettingInput {
  regime?: TaxRegime
  companyName?: string | null
  taxCode?: string | null
  address?: string | null
  periodType?: TaxPeriodType
  defaultOutputVatRate?: VatRate
  pricesIncludeVat?: boolean
  householdVatPercent?: number
  householdPitPercent?: number
  householdExemptThreshold?: number
}

export function useTaxSettings() {
  return useQuery<TaxSetting>({
    queryKey: QUERY_KEYS.taxSettings,
    queryFn: () => api.get('/tax/settings'),
  })
}

export function useUpdateTaxSettings() {
  return useMutation({
    mutationFn: (data: UpdateTaxSettingInput) => api.put('/tax/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taxSettings })
      useToastStore.getState().success('Đã lưu cấu hình thuế')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}
