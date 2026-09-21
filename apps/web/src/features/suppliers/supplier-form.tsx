import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { WinDialog, WinGroupBox, WinInput } from '@wms/ui-winforms'
import type { Supplier } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  phone: z.string().min(1, 'Bắt buộc'),
  address: z.string().min(1, 'Bắt buộc'),
  tax_code: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{10}$/.test(v) || /^\d{13}$/.test(v) || /^\d{10}-\d{3}$/.test(v), {
      message: 'MST phải có 10 hoặc 13 chữ số (cho phép dạng 0123456789-001)',
    }),
  note: z.string().optional(),
  is_individual: z.boolean().default(false),
  id_number: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{9}$/.test(v) || /^\d{12}$/.test(v), {
      message: 'Số CCCD/CMND phải có 9 hoặc 12 chữ số',
    }),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  data: Supplier | null
  onClose: () => void
  onSave?: (data: FormData) => void
}

export function SupplierForm({ open, mode, data, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [submitError, setSubmitError] = useState('')
  const isIndividual = watch('is_individual')

  useEffect(() => {
    if (open) {
      setSubmitError('')
      reset(
        mode === 'edit' && data
          ? {
              name: data.name,
              phone: data.phone,
              address: data.address,
              tax_code: (data as { taxCode?: string | null }).taxCode ?? data.tax_code ?? '',
              note: data.note ?? '',
              is_individual: (data as { isIndividual?: boolean }).isIndividual ?? false,
              id_number: (data as { idNumber?: string | null }).idNumber ?? data.id_number ?? '',
            }
          : { name: '', phone: '', address: '', tax_code: '', note: '', is_individual: false, id_number: '' },
      )
    }
  }, [open, mode, data, reset])

  const onSubmit = async (formData: FormData) => {
    try {
      setSubmitError('')
      await onSave?.(formData)
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Lỗi lưu NCC')
    }
  }

  return (
    <WinDialog
      title={mode === 'add' ? '🆕 Thêm Nhà Cung Cấp' : '✏️ Sửa Nhà Cung Cấp'}
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
      <WinGroupBox title="Thông tin nhà cung cấp">
        <div className="space-y-2.5">
          <WinInput label="Tên NCC" {...register('name')} error={errors.name?.message} />
          <WinInput label="Điện thoại" {...register('phone')} error={errors.phone?.message} />
          <WinInput label="Địa chỉ" {...register('address')} error={errors.address?.message} />
          <WinInput label="Mã số thuế" {...register('tax_code')} error={errors.tax_code?.message} placeholder="10 hoặc 13 chữ số" />
          <label className="flex items-center gap-2 text-win-base">
            <input type="checkbox" {...register('is_individual')} className="w-3 h-3" />
            Người bán cá nhân (không có HĐ)
          </label>
          {isIndividual && (
            <WinInput
              label="Số CCCD/CMND"
              {...register('id_number')}
              error={errors.id_number?.message}
              placeholder="9 hoặc 12 chữ số"
            />
          )}
          <WinInput label="Ghi chú" {...register('note')} />
          {submitError && <p className="text-win-base text-win-error font-semibold">⚠️ {submitError}</p>}
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
