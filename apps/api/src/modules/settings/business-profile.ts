/**
 * Hồ sơ ngành (business profile) + feature flags.
 * Thêm flag mới: xem mục "Feature flags" trong CLAUDE.md.
 */
export const BUSINESS_PROFILES = ['FNB', 'FASHION', 'RETAIL'] as const;
export type BusinessProfile = (typeof BUSINESS_PROFILES)[number];

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
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureFlags = Record<FeatureKey, boolean>;

const FNB: FeatureFlags = {
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
};

export const PROFILE_FEATURES: Record<BusinessProfile, FeatureFlags> = {
  FNB,
  FASHION: {
    ...FNB,
    recipes: false,
    menu: false,
    processing: false,
    kiotviet_recipe_deduct: false,
    expiry_tracking: false,
    unit_conversion: false,
    product_variants: true,
    barcode_required: true,
    customer_returns: true,
  },
  RETAIL: {
    ...FNB,
    recipes: false,
    menu: false,
    processing: false,
    kiotviet_recipe_deduct: false,
    barcode_required: true,
    customer_returns: true,
  },
};

export type FeatureOverrides = Partial<FeatureFlags>;

export interface FeaturesState {
  profile: BusinessProfile;
  flags: FeatureFlags;
  overrides: FeatureOverrides;
  /** Mặc định của từng profile — để UI tính override khi đổi profile. */
  profileDefaults: Record<BusinessProfile, FeatureFlags>;
}

export function isBusinessProfile(v: unknown): v is BusinessProfile {
  return typeof v === 'string' && (BUSINESS_PROFILES as readonly string[]).includes(v);
}

export function isFeatureKey(v: string): v is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(v);
}

/** Profile mặc định từ env; giá trị sai/thiếu → FNB (hành vi hiện tại). */
export function profileFromEnv(env: string | undefined): BusinessProfile {
  const v = env?.trim().toUpperCase();
  return isBusinessProfile(v) ? v : 'FNB';
}

/** Lọc override: chỉ giữ key hợp lệ có giá trị boolean. */
export function sanitizeOverrides(raw: unknown): FeatureOverrides {
  const out: FeatureOverrides = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isFeatureKey(k) && typeof v === 'boolean') out[k] = v;
  }
  return out;
}

export function resolveFeatures(profile: BusinessProfile, overrides: FeatureOverrides): FeaturesState {
  return { profile, flags: { ...PROFILE_FEATURES[profile], ...overrides }, overrides, profileDefaults: PROFILE_FEATURES };
}
