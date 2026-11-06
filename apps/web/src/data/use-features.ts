import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { useToastStore } from '@/stores/toast.store'
import { getTerm } from '@/utils/terms'
import type { BusinessProfile, TermKey } from '@/utils/terms'

export type { BusinessProfile }

export const FEATURE_KEYS = [
  'recipes',
  'menu',
  'processing',
  'kiotviet_recipe_deduct',
  'expiry_tracking',
  'unit_conversion',
  'product_variants',
  'barcode_required',
  'customer_returns',
  'sales_channels',
] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]
export type FeatureFlags = Record<FeatureKey, boolean>

export interface FeaturesState {
  profile: BusinessProfile
  flags: FeatureFlags
  overrides: Partial<FeatureFlags>
  profileDefaults: Record<BusinessProfile, FeatureFlags>
}

export interface UpdateFeaturesInput {
  profile?: BusinessProfile
  overrides?: Partial<FeatureFlags>
}

const FEATURES_KEY = ['settings', 'features'] as const

/** Mặc định trong lúc chưa tải xong: FNB (deploy hiện tại) — không nháy giao diện. */
const FNB_DEFAULT: FeaturesState = {
  profile: 'FNB',
  flags: {
    recipes: true,
    menu: true,
    processing: true,
    kiotviet_recipe_deduct: true,
    expiry_tracking: true,
    unit_conversion: true,
    product_variants: false,
    barcode_required: false,
    customer_returns: false,
    sales_channels: true,
  },
  overrides: {},
  profileDefaults: {} as FeaturesState['profileDefaults'],
}

export function useFeatures() {
  const q = useQuery<FeaturesState>(
    {
      queryKey: FEATURES_KEY,
      queryFn: () => api.get('/settings/features'),
      staleTime: 5 * 60 * 1000,
    },
    queryClient,
  ) // truyền client tường minh: useTerm dùng được cả ở component không nằm trong QueryClientProvider (vd. test)
  const state = q.data ?? FNB_DEFAULT
  return { ...state, isLoaded: q.isSuccess, isEnabled: (f: FeatureKey) => state.flags[f] }
}

/** Nhãn hiển thị theo profile: `const t = useTerm(); t('item')`. */
export function useTerm() {
  const { profile } = useFeatures()
  return (key: TermKey) => getTerm(profile, key)
}

export function useUpdateFeatures() {
  return useMutation({
    mutationFn: (data: UpdateFeaturesInput) => api.put('/settings/features', data),
    onSuccess: (data) => {
      queryClient.setQueryData(FEATURES_KEY, data)
      useToastStore.getState().success('Đã lưu cấu hình ngành nghề')
    },
    onError: (e: Error) => useToastStore.getState().error(e.message),
  })
}
