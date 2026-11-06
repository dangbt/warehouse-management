import { Lock } from 'lucide-react'
import { useState } from 'react'
import { WinGroupBox, WinInput } from '@wms/ui-winforms'
import { useInventoryPeriod, useLockInventoryPeriod, useReopenInventoryPeriod } from '@/data'
import { useAuthStore } from '@/stores/auth.store'
import { formatDate } from '@wms/shared'

const btn = 'px-4 py-1 text-win-base bg-win-active-title text-white border border-win-active-title min-w-[80px] cursor-pointer disabled:opacity-50 hover:opacity-90'

export function InventoryPeriodPage() {
  const { data, isLoading } = useInventoryPeriod()
  const lock = useLockInventoryPeriod()
  const reopen = useReopenInventoryPeriod()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [date, setDate] = useState('')
  const [reopenDate, setReopenDate] = useState('')
  const canClose = hasPermission('inventory_period:close')
  const canReopen = hasPermission('inventory_period:reopen')
  const locked = data?.lockedUntil

  const handleLock = () => {
    if (!window.confirm(`Khoá sổ kho đến hết ngày ${formatDate(date)}? Hệ thống sẽ tự tính giá xuất kho các kỳ chưa tính trước khi khoá.`)) return
    lock.mutate(date, { onSuccess: () => setDate('') })
  }
  const handleReopen = () => {
    const target = reopenDate ? `lùi ngày khoá về ${formatDate(reopenDate)}` : 'mở khoá hoàn toàn'
    if (!window.confirm(`Xác nhận ${target}?`)) return
    reopen.mutate(reopenDate || undefined, { onSuccess: () => setReopenDate('') })
  }

  if (isLoading) return <div className="p-4 text-win-base text-win-text-secondary">Đang tải...</div>

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      <h1 className="text-base font-semibold text-win-text mb-2 flex items-center gap-2">
        <Lock size={18} strokeWidth={1.75} className="text-win-active-title" /> Khoá sổ kho
      </h1>
      <div className="max-w-[560px] space-y-2">
        <WinGroupBox title="Trạng thái">
          <p className="text-win-base" data-testid="period-status">
            {locked ? <>Đã khoá sổ đến hết ngày <b>{formatDate(locked)}</b>. Chứng từ có ngày chứng từ ≤ ngày này không thể tạo/sửa/duyệt.</> : 'Chưa khoá sổ.'}
          </p>
        </WinGroupBox>

        {canClose && (
          <WinGroupBox title="Khoá sổ đến ngày">
            <div className="space-y-2.5">
              <WinInput label="Ngày khoá sổ" type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="period-lock-date" />
              <p className="text-win-sm text-win-text-secondary">Trước khi khoá, hệ thống tự chạy Tính giá xuất kho cho các tháng chưa tính.</p>
              <div className="flex justify-end">
                <button onClick={handleLock} disabled={lock.isPending || !date} className={btn} data-testid="period-lock">
                  {lock.isPending ? 'Đang khoá...' : 'Khoá sổ'}
                </button>
              </div>
            </div>
          </WinGroupBox>
        )}

        {canReopen && locked && (
          <WinGroupBox title="Mở khoá sổ">
            <div className="space-y-2.5">
              <WinInput label="Lùi về ngày" type="date" value={reopenDate} onChange={(e) => setReopenDate(e.target.value)} data-testid="period-reopen-date" />
              <p className="text-win-sm text-win-text-secondary">Để trống để mở khoá hoàn toàn. Thao tác được ghi vào nhật ký hệ thống.</p>
              <div className="flex justify-end">
                <button onClick={handleReopen} disabled={reopen.isPending} className={btn} data-testid="period-reopen">
                  {reopen.isPending ? 'Đang mở...' : 'Mở khoá'}
                </button>
              </div>
            </div>
          </WinGroupBox>
        )}
      </div>
    </div>
  )
}
