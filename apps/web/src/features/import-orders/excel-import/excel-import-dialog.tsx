import { useMemo, useRef, useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { WinDialog } from '@wms/ui-winforms'
import { formatCurrency } from '@wms/shared'
import { useBulkCreateImportOrders, type BulkImportReport } from '@/data/use-import-orders'
import { useToastStore } from '@/stores/toast.store'
import { normalizeKey } from './columns'
import { parseRows, type ParsedRow } from './parse'
import { PreviewTable } from './preview-table'
import { buildTemplateBuffer, downloadBuffer, readWorkbookMatrix } from './template'
import { useImportCatalog } from './use-catalog'
import { buildOrders, validateRows } from './validate'

const btn = 'h-10 px-5 text-[14px] bg-win-button border border-win-button-border min-w-[100px] cursor-pointer hover:bg-win-button-hover disabled:opacity-50 disabled:cursor-not-allowed'

export function ExcelImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { catalog, error: catalogError } = useImportCatalog(open)
  const bulk = useBulkCreateImportOrders()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [fileError, setFileError] = useState('')
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [ingMap, setIngMap] = useState<Record<string, string>>({})
  const [report, setReport] = useState<BulkImportReport | null>(null)
  const [serverError, setServerError] = useState('')

  const rows = useMemo(
    () => (catalog ? validateRows(parsed.filter((r) => !removed.has(r.rowNo)), catalog, ingMap) : []),
    [parsed, removed, catalog, ingMap],
  )
  const errorCount = rows.filter((r) => r.allErrors.length > 0).length
  const orders = useMemo(() => (errorCount === 0 ? buildOrders(rows) : []), [rows, errorCount])

  const reset = () => {
    setParsed([])
    setFileError('')
    setRemoved(new Set())
    setIngMap({})
    setReport(null)
    setServerError('')
  }
  const close = () => {
    reset()
    onClose()
  }

  const onFile = async (file?: File) => {
    if (!file) return
    reset()
    try {
      const res = parseRows(await readWorkbookMatrix(file))
      if (res.fileError) setFileError(res.fileError)
      else setParsed(res.rows)
    } catch {
      setFileError('Không đọc được file. Hãy dùng file .xlsx theo mẫu.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    setServerError('')
    try {
      const res = await bulk.mutateAsync(orders)
      setReport(res)
      useToastStore.getState().success(`Đã tạo ${res.created} phiếu nhập`)
    } catch (e) {
      setServerError((e as Error).message)
    }
  }

  if (!open) return null
  return (
    <WinDialog
      title="Nhập phiếu nhập kho từ Excel"
      icon={<FileSpreadsheet size={16} strokeWidth={1.75} />}
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
          <button type="button" className={`${btn} inline-flex items-center gap-1.5`} onClick={async () => downloadBuffer(await buildTemplateBuffer(), 'mau-nhap-kho.xlsx')}>
            <Download size={16} /> Tải file mẫu
          </button>
          <button type="button" className={`${btn} inline-flex items-center gap-1.5`} disabled={!catalog} onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Chọn file Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {!catalog && !catalogError && <span className="text-win-text-secondary">Đang tải danh mục...</span>}
        </div>
        {catalogError && <div className="text-red-700">Không tải được danh mục: {catalogError}</div>}
        {fileError && <div className="text-red-700">{fileError}</div>}
        {serverError && <div className="text-red-700">Không tạo được (không phiếu nào được lưu): {serverError}</div>}

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
          catalog &&
          rows.length > 0 && (
            <PreviewTable
              rows={rows}
              ingredients={catalog.ingredients}
              onMapIngredient={(text, id) => setIngMap((m) => ({ ...m, [normalizeKey(text)]: id }))}
              onRemove={(no) => setRemoved((s) => new Set(s).add(no))}
            />
          )
        )}
      </div>
    </WinDialog>
  )
}
