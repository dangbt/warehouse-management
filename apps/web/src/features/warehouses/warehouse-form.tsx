import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { WinDialog, WinGroupBox, WinInput } from '@wms/ui-winforms'
import type { Warehouse, WarehouseInput } from '@/data/use-warehouses'

interface FormValues {
  code: string
  name: string
  address: string
  is_default: boolean
  active: boolean
}

interface Props {
  open: boolean
  mode: 'add' | 'edit'
  data: Warehouse | null
  onClose: () => void
  onSave: (v: WarehouseInput) => Promise<void>
}

export function WarehouseForm({ open, mode, data, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    reset(
      mode === 'edit' && data
        ? { code: data.code, name: data.name, address: data.address ?? '', is_default: data.isDefault, active: data.active }
        : { code: '', name: '', address: '', is_default: false, active: true },
    )
  }, [open, mode, data, reset])

  const submit = async (v: FormValues) => {
    const payload: WarehouseInput = { code: v.code, name: v.name, address: v.address.trim() || null, active: v.active }
    // Kho đang mặc định không gửi is_default=false (API chặn: phải luôn có 1 kho mặc định).
    if (v.is_default || !data?.isDefault) payload.is_default = v.is_default
    await onSave(payload)
  }

  return (
    <WinDialog
      title={mode === 'add' ? 'Thêm kho' : 'Sửa kho'}
      open={open}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button
            data-testid="warehouse-form-ok"
            onClick={handleSubmit(submit)}
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
      <WinGroupBox title="Thông tin kho">
        <div className="space-y-2.5">
          <WinInput label="Mã kho" {...register('code', { required: 'Bắt buộc' })} error={errors.code?.message} />
          <WinInput label="Tên kho" {...register('name', { required: 'Bắt buộc' })} error={errors.name?.message} />
          <WinInput label="Địa chỉ" {...register('address')} />
          <label className="flex items-center gap-2 text-win-base ml-32">
            <input type="checkbox" {...register('is_default')} disabled={data?.isDefault && mode === 'edit'} />
            Kho mặc định
          </label>
          <label className="flex items-center gap-2 text-win-base ml-32">
            <input type="checkbox" {...register('active')} disabled={data?.isDefault && mode === 'edit'} />
            Đang hoạt động
          </label>
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
