import { useMemo, useRef, useState } from 'react'
import { FileCode2, Upload } from 'lucide-react'
import { WinDialog } from '@wms/ui-winforms'
import { formatCurrency } from '@wms/shared'
import { useBulkCreateImportOrders, type BulkImportReport } from '@/data/use-import-orders'
import { useToastStore } from '@/stores/toast.store'
import { normalizeKey } from '../excel-import/columns'
import { PreviewTable } from '../excel-import/preview-table'
import { useImportCatalog } from '../excel-import/use-catalog'
import { buildOrders, validateRows, type SupplierRef } from '../excel-import/validate'
import { createSupplierFromSeller, saveMappings, uploadEinvoices } from './api'
import { InvoiceList } from './invoice-list'
import { buildRows } from './to-rows'
import type { EinvoiceResult } from './types'

const btn = 'h-10 px-5 text-[14px] bg-win-button border border-win-button-border min-w-[100px] cursor-pointer hover:bg-win-button-hover disabled:opacity-50 disabled:cursor-not-allowed'

/** Tạo phiếu nhập từ file XML hoá đơn điện tử (TT78): đọc → map NCC theo MST/hàng → xem trước (tái dùng WMS-13) → tạo. */
export function EinvoiceImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { catalog, error: catalogError } = useImportCatalog(open)
  const bulk = useBulkCreateImportOrders()
  const fileRef = useRef<HTMLInputElement>(null)
  const [results, setResults] = useState<EinvoiceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState<string | null>(null)
  const [newSuppliers, setNewSuppliers] = useState<SupplierRef[]>([])
  const [factors, setFactors] = useState<Record<string, number>>({})
  const [ingMapUser, setIngMapUser] = useState<Record<string, string>>({})
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [report, setReport] = useState<BulkImportReport | null>(null)

  const full = useMemo(() => catalog && { ...catalog, suppliers: [...catalog.suppliers, ...newSuppliers] }, [catalog, newSuppliers])
  const built = useMemo(() => buildRows(results, factors, new Set()), [results, factors])
  const ingMap = useMemo(() => ({ ...built.seedMap, ...ingMapUser }), [built.seedMap, ingMapUser])
  const rows = useMemo(() => (full ? validateRows(built.rows.filter((r) => !removed.has(r.rowNo)), full, ingMap) : []), [built.rows, removed, full, ingMap])
  const errorCount = rows.filter((r) => r.allErrors.length > 0).length
  const orders = useMemo(() => (errorCount === 0 ? buildOrders(rows) : []), [rows, errorCount])

  const reset = () => {
    setResults([])
    setError('')
    setNewSuppliers([])
    setFactors({})
    setIngMapUser({})
    setRemoved(new Set())
    setReport(null)
  }
  const close = () => {
    reset()
    onClose()
  }

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return
    reset()
    setLoading(true)
    try {
      setResults(await uploadEinvoices([...list]))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const createSupplier = async (r: EinvoiceResult) => {
    const s = r.invoice!.seller
    setCreating(r.fileName)
    setError('')
    try {
      const sup = await createSupplierFromSeller(s)
      setNewSuppliers((l) => [...l, { id: sup.id, name: sup.name, taxCode: s.taxCode }])
      useToastStore.getState().success(`Đã tạo NCC ${sup.name}`)
    } catch (e) {
      setError(`Không tạo được NCC: ${(e as Error).message}`)
    } finally {
      setCreating(null)
    }
  }

  const factorByRow = (rowNo: number, factor: number) => {
    const key = built.keyByRow[rowNo]
    if (key) setFactors((f) => ({ ...f, [key]: factor }))
  }

  const submit = async () => {
    setError('')
    try {
      const res = await bulk.mutateAsync(orders)
      setReport(res)
      useToastStore.getState().success(`Đã tạo ${res.created} phiếu nhập`)
      // Nhớ mapping hàng → nguyên liệu cho lần sau; lỗi lưu mapping không làm hỏng phiếu đã tạo.
      const seen = new Set<string>()
      const mappings = rows.flatMap((r) => {
        const unit = built.unitByRow[r.rowNo] ?? ''
        const k = `${r.supplierId}|${normalizeKey(r.ingredient)}|${normalizeKey(unit)}`
        if (!r.supplierId || !r.ingredientId || seen.has(k)) return []
        seen.add(k)
        return [{ supplier_id: r.supplierId, item_name: r.ingredient, unit, ingredient_id: r.ingredientId, factor: r.factor ?? 1 }]
      })
      await saveMappings(mappings).catch(() => useToastStore.getState().error('Đã tạo phiếu nhưng chưa lưu được mapping hàng hoá'))
    } catch (e) {
      setError(`Không tạo được (không phiếu nào được lưu): ${(e as Error).message}`)
    }
  }

  if (!open) return null
  return (
    <WinDialog
      title="Nhập phiếu nhập kho từ hoá đơn điện tử (XML)"
      icon={<FileCode2 size={16} strokeWidth={1.75} />}
      open={open}
      onClose={close}
      width={Math.min(1180, typeof window !== 'undefined' ? window.innerWidth * 0.96 : 1180)}
      footer={
        <>
          <span className="mr-auto text-[13px]">
            {rows.length > 0 && !report && `${rows.length} dòng · ${rows.length - errorCount} hợp lệ · ${errorCount} lỗi`}
          </span>
          <button type="button" className={btn} onClick={close}>
            {report ? 'Đóng' : 'Huỷ'}
          </button>
          {!report && (
            <button type="button" className={btn} disabled={rows.length === 0 || errorCount > 0 || bulk.isPending} onClick={submit}>
              {bulk.isPending ? 'Đang tạo...' : `Tạo ${orders.length || ''} phiếu`}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-3 text-[14px]">
        <div className="flex gap-2 items-center">
          <button type="button" className={`${btn} inline-flex items-center gap-1.5`} disabled={!catalog || loading} onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Chọn file XML / ZIP
          </button>
          <input ref={fileRef} type="file" multiple accept=".xml,.zip" className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <span className="text-win-text-secondary">{loading ? 'Đang đọc hoá đơn...' : !catalog && !catalogError ? 'Đang tải danh mục...' : 'Mỗi file ≤ 5MB, chọn được nhiều file'}</span>
        </div>
        {catalogError && <div className="text-red-700">Không tải được danh mục: {catalogError}</div>}
        {error && <div className="text-red-700">{error}</div>}

        {report ? (
          <div className="p-3 border border-green-300 bg-green-50">
            Đã tạo <strong>{report.created}</strong> phiếu (Chờ duyệt) · {report.itemCount} dòng hàng · Tổng {formatCurrency(report.totalAmount)}
            <ul className="mt-2 list-disc pl-5">
              {report.orders.map((o) => (
                <li key={o.id}>
                  {o.code} — {o.itemCount} dòng — {formatCurrency(o.totalAmount)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {results.length > 0 && <InvoiceList results={results} creating={creating} onCreateSupplier={createSupplier} />}
            {full && rows.length > 0 && (
              <PreviewTable
                rows={rows}
                ingredients={full.ingredients}
                onMapIngredient={(text, id) => setIngMapUser((m) => ({ ...m, [normalizeKey(text)]: id }))}
                onFactorChange={factorByRow}
                onRemove={(no) => setRemoved((s) => new Set(s).add(no))}
              />
            )}
          </>
        )}
      </div>
    </WinDialog>
  )
}
