import { Calculator } from 'lucide-react'
import { useEffect, useState } from 'react'
import { WinGroupBox, WinInput, WinSelect } from '@wms/ui-winforms'
import { COSTING_METHOD_LABELS, useCostingSettings, useRunCosting, useUpdateCostingMethod } from '@/data'
import type { CostingMethod } from '@/data'

const methodOptions = (Object.keys(COSTING_METHOD_LABELS) as CostingMethod[]).map((v) => ({ value: v, label: COSTING_METHOD_LABELS[v] }))
const btn = 'px-4 py-1 text-win-base bg-win-active-title text-white border border-win-active-title min-w-[80px] cursor-pointer disabled:opacity-50 hover:opacity-90'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function CostingPage() {
  const { data, isLoading } = useCostingSettings()
  const updateMethod = useUpdateCostingMethod()
  const run = useRunCosting()
  const [method, setMethod] = useState<CostingMethod>('AVG_PERIOD')
  const [month, setMonth] = useState(currentMonth())

  useEffect(() => {
    if (data) setMethod(data.costingMethod)
  }, [data])

  const handleSave = () => {
    const changing = data && method !== data.costingMethod
    if (changing && data.hasTransactions && !window.confirm('Đã có giao dịch kho. Đổi phương pháp sẽ ảnh hưởng giá vốn các kỳ tính sau. Tiếp tục?')) return
    updateMethod.mutate({ costing_method: method, confirm: true })
  }

  if (isLoading) return <div className="p-4 text-win-base text-win-text-secondary">Đang tải...</div>
  const result = run.data

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      <h1 className="text-base font-semibold text-win-text mb-2 flex items-center gap-2">
        <Calculator size={18} strokeWidth={1.75} className="text-win-active-title" /> Tính giá xuất kho
      </h1>
      <div className="max-w-[560px] space-y-2">
        <WinGroupBox title="Phương pháp tính giá xuất kho">
          <div className="space-y-2.5">
            <WinSelect label="Phương pháp" options={methodOptions} value={method} onChange={(e) => setMethod(e.target.value as CostingMethod)} />
            {data?.hasTransactions && <p className="text-win-sm text-win-text-secondary">Đã có giao dịch kho — đổi phương pháp cần xác nhận.</p>}
            <div className="flex justify-end">
              <button onClick={handleSave} disabled={updateMethod.isPending} className={btn}>
                {updateMethod.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </WinGroupBox>

        <WinGroupBox title="Tính giá xuất kho theo kỳ">
          <div className="space-y-2.5">
            <WinInput label="Kỳ (tháng)" type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="costing-month" />
            <div className="flex justify-end">
              <button onClick={() => run.mutate(month)} disabled={run.isPending || !month} className={btn} data-testid="costing-run">
                {run.isPending ? 'Đang tính...' : 'Tính giá'}
              </button>
            </div>
            {result && (
              <div className="text-win-base space-y-0.5" data-testid="costing-result">
                <div>Kỳ {result.month} — {COSTING_METHOD_LABELS[result.method]}</div>
                <div>Số giao dịch được tính: <b>{result.processed}</b> (thay đổi giá: <b>{result.updated}</b>)</div>
                <div>Tổng giá trị xuất kho: <b>{result.totalOutValue.toLocaleString('vi-VN')}</b></div>
              </div>
            )}
          </div>
        </WinGroupBox>
      </div>
    </div>
  )
}
