import { formatCurrency } from '@wms/shared'
import { CircleAlert, CircleCheck, TriangleAlert, UserPlus } from 'lucide-react'
import type { EinvoiceResult } from './types'

interface Props {
  results: EinvoiceResult[]
  creating: string | null
  onCreateSupplier: (r: EinvoiceResult) => void
}

/** Tóm tắt từng file: hoá đơn, NCC (khớp MST hay cần tạo mới), trùng, cảnh báo lệch tổng. */
export function InvoiceList({ results, creating, onCreateSupplier }: Props) {
  return (
    <ul className="border border-win-grid-border divide-y divide-win-grid-border text-[13px] max-h-[22vh] overflow-auto">
      {results.map((r) => {
        const inv = r.invoice
        return (
          <li key={r.fileName} className="p-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">{r.fileName}</span>
              {!r.ok && (
                <span className="inline-flex items-center gap-1 text-red-700">
                  <CircleAlert size={14} /> {r.error?.message} ({r.error?.code})
                </span>
              )}
              {inv && (
                <>
                  <span>
                    {inv.symbol} · số {inv.invoiceNo} · {inv.invoiceDate}
                  </span>
                  <span>
                    {inv.seller.name} (MST {inv.seller.taxCode})
                  </span>
                  <span>Tổng {formatCurrency(inv.declared.total || inv.computed.total)}</span>
                  {r.duplicateOf ? (
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <CircleAlert size={14} /> Hoá đơn đã nhập ({r.duplicateOf}) — bỏ qua
                    </span>
                  ) : r.supplier ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CircleCheck size={14} /> NCC: {r.supplier.name}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={creating === r.fileName}
                      onClick={() => onCreateSupplier(r)}
                      className="inline-flex items-center gap-1 px-2 h-7 border border-win-button-border bg-win-button cursor-pointer hover:bg-win-button-hover disabled:opacity-50"
                    >
                      <UserPlus size={14} /> Tạo NCC mới từ hoá đơn
                    </button>
                  )}
                </>
              )}
            </div>
            {inv?.warnings.map((w) => (
              <div key={w.message} className="flex items-start gap-1 text-amber-700 mt-1">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {w.message}
              </div>
            ))}
          </li>
        )
      })}
    </ul>
  )
}
