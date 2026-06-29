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
  note: z.string().optional(),
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
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open) {
      setSubmitError('')
      reset(
        mode === 'edit' && data
          ? { name: data.name, phone: data.phone, address: data.address, note: data.note ?? '' }
          : { name: '', phone: '', address: '', note: '' },
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
          <WinInput label="Ghi chú" {...register('note')} />
          {submitError && <p className="text-[11px] text-win-error font-semibold">⚠️ {submitError}</p>}
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
