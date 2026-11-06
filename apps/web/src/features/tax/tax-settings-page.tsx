import { useEffect, useState } from 'react'
import { WinGroupBox, WinInput, WinSelect } from '@wms/ui-winforms'
import {
  TAX_REGIMES,
  TAX_REGIME_LABELS,
  TAX_PERIOD_TYPES,
  TAX_PERIOD_TYPE_LABELS,
  VAT_RATES,
  VAT_RATE_LABELS,
} from '@wms/shared'
import type { TaxRegime, TaxPeriodType, VatRate } from '@wms/shared'
import { useTaxSettings, useUpdateTaxSettings } from '@/data'

const regimeOptions = TAX_REGIMES.map((v) => ({ value: v, label: TAX_REGIME_LABELS[v] }))
const periodOptions = TAX_PERIOD_TYPES.map((v) => ({ value: v, label: TAX_PERIOD_TYPE_LABELS[v] }))
const vatRateOptions = VAT_RATES.map((v) => ({ value: v, label: VAT_RATE_LABELS[v] }))

interface FormState {
  regime: TaxRegime
  companyName: string
  taxCode: string
  address: string
  periodType: TaxPeriodType
  defaultOutputVatRate: VatRate
  pricesIncludeVat: boolean
  householdVatPercent: string
  householdPitPercent: string
  householdExemptThreshold: string
}

const EMPTY: FormState = {
  regime: 'VAT_DEDUCTION',
  companyName: '',
  taxCode: '',
  address: '',
  periodType: 'QUARTER',
  defaultOutputVatRate: '8',
  pricesIncludeVat: true,
  householdVatPercent: '3',
  householdPitPercent: '1.5',
  householdExemptThreshold: '200000000',
}

export function TaxSettingsPage() {
  const { data, isLoading } = useTaxSettings()
  const updateMutation = useUpdateTaxSettings()
  const [form, setForm] = useState<FormState>(EMPTY)

  useEffect(() => {
    if (data) {
      setForm({
        regime: data.regime,
        companyName: data.companyName ?? '',
        taxCode: data.taxCode ?? '',
        address: data.address ?? '',
        periodType: data.periodType,
        defaultOutputVatRate: data.defaultOutputVatRate,
        pricesIncludeVat: data.pricesIncludeVat,
        householdVatPercent: String(data.householdVatPercent),
        householdPitPercent: String(data.householdPitPercent),
        householdExemptThreshold: String(data.householdExemptThreshold),
      })
    }
  }, [data])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = () => {
    updateMutation.mutate({
      regime: form.regime,
      companyName: form.companyName || null,
      taxCode: form.taxCode || null,
      address: form.address || null,
      periodType: form.periodType,
      defaultOutputVatRate: form.defaultOutputVatRate,
      pricesIncludeVat: form.pricesIncludeVat,
      householdVatPercent: Number(form.householdVatPercent),
      householdPitPercent: Number(form.householdPitPercent),
      householdExemptThreshold: Number(form.householdExemptThreshold),
    })
  }

  if (isLoading) {
    return <div className="p-4 text-win-base text-win-text-secondary">Đang tải...</div>
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      <h1 className="text-base font-semibold text-win-text mb-2">🧾 Cấu hình thuế</h1>

      <div className="max-w-[560px] space-y-2">
        <WinGroupBox title="Thông tin người nộp thuế">
          <div className="space-y-2.5">
            <WinInput label="Tên đơn vị" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
            <WinInput label="Mã số thuế" value={form.taxCode} onChange={(e) => set('taxCode', e.target.value)} placeholder="10 hoặc 13 chữ số" />
            <WinInput label="Địa chỉ" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
        </WinGroupBox>

        <WinGroupBox title="Chế độ thuế">
          <div className="space-y-2.5">
            <WinSelect
              label="Chế độ"
              options={regimeOptions}
              value={form.regime}
              onChange={(e) => set('regime', e.target.value as TaxRegime)}
            />
            <WinSelect
              label="Kỳ kê khai"
              options={periodOptions}
              value={form.periodType}
              onChange={(e) => set('periodType', e.target.value as TaxPeriodType)}
            />
            <WinSelect
              label="Thuế suất mặc định"
              options={vatRateOptions}
              value={form.defaultOutputVatRate}
              onChange={(e) => set('defaultOutputVatRate', e.target.value as VatRate)}
            />
            <div className="flex items-center gap-2">
              <label className="text-win-base w-30 text-right shrink-0">Giá đã gồm VAT:</label>
              <input
                type="checkbox"
                data-testid="checkbox-prices-include-vat"
                checked={form.pricesIncludeVat}
                onChange={(e) => set('pricesIncludeVat', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>
        </WinGroupBox>

        {form.regime === 'HOUSEHOLD' && (
          <WinGroupBox title="Hộ kinh doanh">
            <div className="space-y-2.5">
              <WinInput
                label="Tỷ lệ % GTGT"
                type="number"
                value={form.householdVatPercent}
                onChange={(e) => set('householdVatPercent', e.target.value)}
              />
              <WinInput
                label="Tỷ lệ % TNCN"
                type="number"
                value={form.householdPitPercent}
                onChange={(e) => set('householdPitPercent', e.target.value)}
              />
              <WinInput
                label="Ngưỡng miễn thuế"
                type="number"
                value={form.householdExemptThreshold}
                onChange={(e) => set('householdExemptThreshold', e.target.value)}
              />
            </div>
          </WinGroupBox>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-4 py-1 text-win-base bg-win-active-title text-white border border-win-active-title min-w-[80px] cursor-pointer disabled:opacity-50 hover:opacity-90"
          >
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}
