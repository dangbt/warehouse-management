import { useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { WinSelect } from '@wms/ui-winforms'
import { useSendSupport } from '@/data/use-support'

const ISSUES = [
  { value: 'Không nhập kho được', label: 'Không nhập kho được' },
  { value: 'Sai số liệu tồn kho', label: 'Sai số liệu tồn kho' },
  { value: 'Không xuất được phiếu', label: 'Không xuất được phiếu' },
  { value: 'Lỗi đồng bộ KiotViet', label: 'Lỗi đồng bộ KiotViet' },
  { value: 'Không đăng nhập được', label: 'Không đăng nhập được' },
  { value: 'Chức năng bị lỗi/treo', label: 'Chức năng bị lỗi/treo' },
  { value: 'Sai công thức/định mức', label: 'Sai công thức/định mức' },
  { value: 'Khác', label: 'Khác' },
]

interface FormData {
  issue: string
  message: string
}

export function SupportWidget() {
  const [open, setOpen] = useState(false)
  const mutation = useSendSupport()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>()

  const onSubmit = (data: FormData) => {
    const text = data.message.trim() ? `[${data.issue}] ${data.message}` : data.issue
    mutation.mutate(text, {
      onSuccess: () => { reset(); setOpen(false) },
    })
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 w-72 border border-win-grid-border bg-win-control shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 bg-win-active-title text-white text-xs font-semibold">
            <span>Hỗ trợ kỹ thuật</span>
            <button onClick={() => setOpen(false)}><X size={14} /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="p-3 space-y-2">
            <WinSelect
              label="Vấn đề"
              options={ISSUES}
              error={errors.issue?.message}
              {...register('issue', { required: 'Chọn vấn đề' })}
            />
            <div className="flex items-start gap-2">
              <label className="text-[11px] w-24 text-right shrink-0 pt-1">Mô tả:</label>
              <textarea
                {...register('message')}
                placeholder="Chi tiết thêm nếu có..."
                className="flex-1 border border-win-input-border px-2 py-1 text-[11px] outline-none focus:border-win-input-focus bg-white resize-none h-16"
              />
            </div>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full flex items-center justify-center gap-1 px-3 py-1 text-xs bg-win-active-title text-white border border-win-active-title disabled:opacity-50 cursor-pointer"
            >
              <Send size={12} />
              {mutation.isPending ? 'Đang gửi...' : 'Gửi'}
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="ml-auto flex items-center justify-center w-10 h-10 bg-win-active-title text-white shadow-lg border border-win-active-title hover:opacity-90 cursor-pointer"
        title="Hỗ trợ"
      >
        <MessageCircle size={20} />
      </button>
    </div>
  )
}
