import type { FeatureKey } from '@/data/use-features'

/** Route → feature flag bắt buộc. Route không liệt kê = luôn bật. */
export const ROUTE_FEATURES: Record<string, FeatureKey> = {
  '/recipes': 'recipes',
  '/menu': 'menu',
  '/processing': 'processing',
  '/kiotviet': 'sales_channels',
}

export function featureForPath(pathname: string): FeatureKey | undefined {
  const base = '/' + pathname.split('/').filter(Boolean)[0]
  return ROUTE_FEATURES[base]
}
