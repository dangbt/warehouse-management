import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/services/api'

const schema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      const res = await api.post('/auth/login', data)
      login(res.user, res.access_token)
      navigate({ to: '/dashboard' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại')
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-win-control">
      <form
        onSubmit={handleSubmit(onSubmit)}
        data-testid="login-form"
        className="w-[360px] bg-white border border-win-grid-border shadow-md"
      >
        <div className="px-4 py-3 border-b border-win-grid-border flex items-center gap-2">
          <img src="/logo.svg" alt="Mâm Vị" className="h-6" />
          <span className="text-sm font-semibold">Mâm Vị</span>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs block mb-1">Email:</label>
            <input
              data-testid="login-email"
              {...register('email')}
              placeholder="Nhập email"
              className="w-full border border-win-input-border px-2 py-1 text-xs outline-none focus:border-win-input-focus bg-white"
            />
            {errors.email && <p className="text-[10px] text-win-error mt-0.5">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-xs block mb-1">Mật khẩu:</label>
            <input
              data-testid="login-password"
              type="password"
              {...register('password')}
              placeholder="Nhập mật khẩu"
              className="w-full border border-win-input-border px-2 py-1 text-xs outline-none focus:border-win-input-focus bg-white"
            />
            {errors.password && <p className="text-[10px] text-win-error mt-0.5">{errors.password.message}</p>}
          </div>
          {error && (
            <p data-testid="login-error" className="text-[10px] text-win-error">
              {error}
            </p>
          )}
        </div>
        <div className="px-5 pb-4">
          <button
            data-testid="login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-1.5 bg-win-active-title text-white text-xs border border-win-active-title cursor-pointer hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </div>
      </form>
    </div>
  )
}
