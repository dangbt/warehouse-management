import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api } from '@/services/api'
import { queryClient } from '@/data/query-client'
import { PROFILE_OPTIONS, REGIME_OPTIONS, setupSchema, toPayload } from './setup-schema'
import type { SetupForm } from './setup-schema'
import { PoweredBy } from '@/components/powered-by'

const INPUT = 'w-full border border-win-input-border h-10 px-2 text-[14px] outline-none focus:border-win-input-focus bg-white'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs block mb-1">{label}</label>
      {children}
      {error && <p className="text-win-xs text-win-error mt-0.5">{error}</p>}
    </div>
  )
}

/** Wizard cài đặt lần đầu — chỉ dùng được khi DB chưa có user nào. */
export function SetupPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const status = useQuery<{ needsSetup: boolean }>(
    { queryKey: ['setup', 'status'], queryFn: () => api.get('/setup/status'), retry: false },
    queryClient,
  )
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: { profile: 'FNB', taxRegime: 'VAT_DEDUCTION', taxCode: '', address: '', logoUrl: '' },
  })

  useEffect(() => {
    if (status.data && !status.data.needsSetup) navigate({ to: '/login' })
  }, [status.data, navigate])

  const onSubmit = async (data: SetupForm) => {
    try {
      setError('')
      await api.post('/setup', toPayload(data))
      queryClient.removeQueries({ queryKey: ['setup'] })
      queryClient.removeQueries({ queryKey: ['settings'] })
      navigate({ to: '/login' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Cài đặt thất bại')
    }
  }

  return (
    <div className="min-h-screen overflow-auto flex flex-col items-center justify-center bg-win-control py-6">
      <form onSubmit={handleSubmit(onSubmit)} data-testid="setup-form" className="w-[480px] bg-white border border-win-grid-border shadow-md">
        <div className="px-4 py-3 border-b border-win-grid-border font-semibold">Cài đặt lần đầu</div>
        <div className="p-5 space-y-3">
          <Field label="Ngành nghề:">
            <select {...register('profile')} className={INPUT}>
              {PROFILE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tên doanh nghiệp (hiển thị trên app & chứng từ):" error={errors.companyName?.message}>
            <input {...register('companyName')} className={INPUT} />
          </Field>
          <Field label="Mã số thuế:" error={errors.taxCode?.message}>
            <input {...register('taxCode')} className={INPUT} placeholder="10 hoặc 13 chữ số" />
          </Field>
          <Field label="Địa chỉ:">
            <input {...register('address')} className={INPUT} />
          </Field>
          <Field label="Chế độ thuế:">
            <select {...register('taxRegime')} className={INPUT}>
              {REGIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Logo URL (tuỳ chọn):">
            <input {...register('logoUrl')} className={INPUT} placeholder="https://..." />
          </Field>
          <div className="border-t border-win-grid-border pt-3 text-xs font-semibold">Tài khoản quản trị</div>
          <Field label="Họ tên:" error={errors.fullName?.message}>
            <input {...register('fullName')} className={INPUT} />
          </Field>
          <Field label="Email:" error={errors.email?.message}>
            <input {...register('email')} className={INPUT} />
          </Field>
          <Field label="Mật khẩu:" error={errors.password?.message}>
            <input type="password" {...register('password')} className={INPUT} />
          </Field>
          {error && <p className="text-win-xs text-win-error">{error}</p>}
        </div>
        <div className="px-5 pb-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 bg-win-active-title text-white text-[14px] border border-win-active-title cursor-pointer hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang cài đặt...' : 'Hoàn tất cài đặt'}
          </button>
        </div>
      </form>
      <PoweredBy />
    </div>
  )
}
