import type { ReactNode } from 'react'
import { useFeatures } from '@/data/use-features'
import type { FeatureKey } from '@/data/use-features'

/** Chỉ render children khi feature flag bật (ẩn nút/khối UI theo ngành). */
export function FeatureGate({ feature, children, fallback = null }: { feature: FeatureKey; children: ReactNode; fallback?: ReactNode }) {
  const { isEnabled } = useFeatures()
  return <>{isEnabled(feature) ? children : fallback}</>
}
