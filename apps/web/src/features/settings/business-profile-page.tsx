import { Briefcase } from 'lucide-react'
import { useEffect, useState } from 'react'
import { WinGroupBox, WinSelect } from '@wms/ui-winforms'
import { useFeatures, useUpdateFeatures, FEATURE_KEYS } from '@/data/use-features'
import type { BusinessProfile, FeatureFlags, FeatureKey } from '@/data/use-features'

const PROFILE_OPTIONS: { value: BusinessProfile; label: string }[] = [
  { value: 'FNB', label: 'F&B (nhà hàng / quán ăn)' },
  { value: 'FASHION', label: 'Thời trang' },
  { value: 'RETAIL', label: 'Bán lẻ' },
]

const FEATURE_LABELS: Record<FeatureKey, string> = {
  recipes: 'Công thức (định mức)',
  menu: 'Thực đơn',
  processing: 'Chế biến (bán thành phẩm)',
  kiotviet_recipe_deduct: 'KiotViet: trừ kho theo công thức',
  expiry_tracking: 'Theo dõi hạn sử dụng / lô',
  unit_conversion: 'Quy đổi đơn vị tính',
  product_variants: 'Biến thể sản phẩm (size/màu)',
  barcode_required: 'Bắt buộc mã vạch',
  customer_returns: 'Khách trả hàng',
  sales_channels: 'Kênh bán hàng (KiotViet)',
}

/** Chỉ giữ những flag khác mặc định của profile → gửi lên làm override. */
function diffOverrides(flags: FeatureFlags, defaults: FeatureFlags): Partial<FeatureFlags> {
  const out: Partial<FeatureFlags> = {}
  for (const k of FEATURE_KEYS) if (flags[k] !== defaults[k]) out[k] = flags[k]
  return out
}

export function BusinessProfilePage() {
  const { profile, flags, profileDefaults, isLoaded } = useFeatures()
  const update = useUpdateFeatures()
  const [draftProfile, setDraftProfile] = useState<BusinessProfile>(profile)
  const [draftFlags, setDraftFlags] = useState<FeatureFlags>(flags)

  useEffect(() => {
    if (isLoaded) {
      setDraftProfile(profile)
      setDraftFlags(flags)
    }
  }, [isLoaded, profile, flags])

  const changeProfile = (p: BusinessProfile) => {
    setDraftProfile(p)
    setDraftFlags(profileDefaults[p]) // đổi ngành → nạp lại bộ flag mặc định của ngành đó
  }

  const save = () => update.mutate({ profile: draftProfile, overrides: diffOverrides(draftFlags, profileDefaults[draftProfile]) })

  if (!isLoaded) return <div className="p-4 text-win-base text-win-text-secondary">Đang tải...</div>

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4" data-testid="business-profile-page">
      <h1 className="text-base font-semibold text-win-text mb-2 flex items-center gap-2">
        <Briefcase size={18} strokeWidth={1.75} className="text-win-active-title" /> Ngành nghề
      </h1>
      <div className="max-w-[560px] space-y-2">
        <WinGroupBox title="Hồ sơ ngành">
          <WinSelect
            label="Ngành"
            data-testid="select-business-profile"
            options={PROFILE_OPTIONS}
            value={draftProfile}
            onChange={(e) => changeProfile(e.target.value as BusinessProfile)}
          />
        </WinGroupBox>
        <WinGroupBox title="Chức năng (feature flags)">
          <div className="space-y-1.5">
            {FEATURE_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 text-win-base cursor-pointer">
                <input
                  type="checkbox"
                  data-testid={`feature-${k}`}
                  checked={draftFlags[k]}
                  onChange={(e) => setDraftFlags((prev) => ({ ...prev, [k]: e.target.checked }))}
                  className="h-4 w-4"
                />
                {FEATURE_LABELS[k]}
                {draftFlags[k] !== profileDefaults[draftProfile][k] && <span className="text-win-text-secondary">(khác mặc định)</span>}
              </label>
            ))}
          </div>
        </WinGroupBox>
        <button
          data-testid="btn-save-business-profile"
          onClick={save}
          disabled={update.isPending}
          className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title min-w-[75px] cursor-pointer disabled:opacity-50"
        >
          Lưu
        </button>
      </div>
    </div>
  )
}
