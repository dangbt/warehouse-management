import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { WinDialog, WinGroupBox, WinInput, WinSelect } from '@wms/ui-winforms'
import { api } from '@/services/api'

const schema = z.object({
  full_name: z.string().min(1, 'Bắt buộc'),
  email: z.string().min(1, 'Bắt buộc').email('Email không hợp lệ'),
  phone: z.string().optional(),
  department_id: z.string().min(1, 'Chọn bộ phận'),
  role_id: z.string().min(1, 'Chọn role'),
  password: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface UserData {
  id: string
  fullName: string
  email: string
  phone?: string
  departmentId?: string
  userRoles?: { role: { id: string; name: string } }[]
}

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  data?: UserData | null
  onClose: () => void
  onSave?: (data: FormData) => void
}

export function UserForm({ open, mode, data, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [departments, setDepartments] = useState<{ value: string; label: string }[]>([])
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([])
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open) {
      setSubmitError('')
      reset(
        mode === 'edit' && data
          ? {
              full_name: data.fullName,
              email: data.email,
              phone: data.phone ?? '',
              department_id: data.departmentId ?? '',
              role_id: data.userRoles?.[0]?.role?.id ?? '',
              password: '',
            }
          : { full_name: '', email: '', phone: '', department_id: '', role_id: '', password: '' },
      )
      Promise.all([api.get('/departments'), api.get('/roles')]).then(([d, r]) => {
        setDepartments((d as { id: string; name: string }[]).map((x) => ({ value: x.id, label: x.name })))
        setRoles((r as { id: string; name: string }[]).map((x) => ({ value: x.id, label: x.name })))
      })
    }
  }, [open, mode, data, reset])

  const onSubmit = async (formData: FormData) => {
    try {
      setSubmitError('')
      await onSave?.(formData)
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi')
    }
  }

  return (
    <WinDialog
      title={mode === 'add' ? '🆕 Thêm User' : '✏️ Sửa User'}
      open={open}
      onClose={onClose}
      width={440}
      footer={
        <>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title min-w-[75px] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : 'OK'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1 text-xs bg-win-button border border-win-button-border min-w-[75px] cursor-pointer hover:bg-win-button-hover"
          >
            Cancel
          </button>
        </>
      }
    >
      <WinGroupBox title="Thông tin người dùng">
        <div className="space-y-2.5">
          <WinInput label="Họ tên" {...register('full_name')} error={errors.full_name?.message} />
          <WinInput label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <WinInput label="Điện thoại" {...register('phone')} />
          <WinSelect
            label="Bộ phận"
            {...register('department_id')}
            options={departments}
            error={errors.department_id?.message}
          />
          <WinSelect label="Role" {...register('role_id')} options={roles} error={errors.role_id?.message} />
          {mode === 'add' && (
            <WinInput label="Mật khẩu" type="password" {...register('password')} placeholder="Mặc định: 123456" />
          )}
          {submitError && <p className="text-[11px] text-win-error font-semibold mt-2">⚠️ {submitError}</p>}
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
