import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { WinDialog, WinGroupBox } from '@wms/ui-winforms'
import { useWarehouses } from '@/data/use-warehouses'
import { useKiotVietWarehouseMap, useSaveKiotVietWarehouseMap } from '@/data/use-kiotviet-warehouse'

interface Row {
  branchId: string
  warehouseId: string
}

const selectCls = 'border border-win-input-border h-8 px-2 text-win-base outline-none bg-white'

/** Cấu hình chi nhánh KiotViet → kho trừ tồn. `knownBranchIds`: chi nhánh thấy trên đơn đã đồng bộ (gợi ý). */
export function WarehouseMappingDialog({ open, onClose, knownBranchIds }: { open: boolean; onClose: () => void; knownBranchIds: string[] }) {
  const { data: warehouses } = useWarehouses({ activeOnly: true })
  const { data: map } = useKiotVietWarehouseMap(open)
  const save = useSaveKiotVietWarehouseMap()
  const [defaultId, setDefaultId] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [newBranch, setNewBranch] = useState('')

  useEffect(() => {
    if (!open || !map) return
    setDefaultId(map.defaultWarehouseId ?? '')
    const ids = [...new Set([...Object.keys(map.branches), ...knownBranchIds])]
    setRows(ids.map((b) => ({ branchId: b, warehouseId: map.branches[b] ?? '' })))
    // knownBranchIds đổi tham chiếu mỗi render; chỉ nạp lại khi mở hộp thoại / mapping đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, map])

  const options = (warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))
  const setRow = (i: number, warehouseId: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, warehouseId } : x)))
  const addBranch = () => {
    const b = newBranch.trim()
    if (b && !rows.some((r) => r.branchId === b)) setRows((r) => [...r, { branchId: b, warehouseId: '' }])
    setNewBranch('')
  }

  const submit = async () => {
    const branches: Record<string, string> = {}
    for (const r of rows) if (r.warehouseId) branches[r.branchId] = r.warehouseId
    await save.mutateAsync({ defaultWarehouseId: defaultId || null, branches })
    onClose()
  }

  return (
    <WinDialog
      title="Chi nhánh KiotViet → Kho"
      open={open}
      onClose={onClose}
      width={520}
      footer={
        <>
          <button
            data-testid="kiotviet-mapping-save"
            onClick={() => void submit()}
            disabled={save.isPending}
            className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title min-w-[75px] cursor-pointer disabled:opacity-50"
          >
            Lưu
          </button>
          <button onClick={onClose} className="px-4 py-1 text-xs bg-win-button border border-win-button-border min-w-[75px] cursor-pointer hover:bg-win-button-hover">
            Đóng
          </button>
        </>
      }
    >
      <WinGroupBox title="Kho trừ tồn theo chi nhánh">
        <div className="space-y-2 text-win-base">
          <label className="flex items-center gap-2">
            <span className="w-44">Chi nhánh khác (mặc định)</span>
            <select data-testid="kiotviet-default-warehouse" className={selectCls} value={defaultId} onChange={(e) => setDefaultId(e.target.value)}>
              <option value="">Kho mặc định của hệ thống</option>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          {rows.map((r, i) => (
            <div key={r.branchId} className="flex items-center gap-2">
              <span className="w-44 truncate" title={r.branchId}>Chi nhánh {r.branchId}</span>
              <select className={selectCls} value={r.warehouseId} onChange={(e) => setRow(i, e.target.value)}>
                <option value="">Theo mặc định</option>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button title="Bỏ dòng" className="text-win-error cursor-pointer" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              className={`${selectCls} w-44`}
              placeholder="Mã chi nhánh KiotViet"
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBranch()}
            />
            <button className="px-3 h-8 text-xs bg-win-button border border-win-button-border cursor-pointer" onClick={addBranch}>
              Thêm chi nhánh
            </button>
          </div>
        </div>
      </WinGroupBox>
    </WinDialog>
  )
}
