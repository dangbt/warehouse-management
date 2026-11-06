import { useEffect, useRef } from 'react'
import type { PrintOrg } from './print-layout'

export function dateLine(value: string | Date) {
  const d = new Date(value)
  return `Ngày ${String(d.getDate()).padStart(2, '0')} tháng ${String(d.getMonth() + 1).padStart(2, '0')} năm ${d.getFullYear()}`
}

export function isOrgReady(org?: PrintOrg) {
  return !!org?.companyName && !!org?.address && !!org?.taxCode
}

/** Tự gọi window.print() một lần khi dữ liệu + header đơn vị đã sẵn sàng. */
export function useAutoPrint(ready: boolean) {
  const printed = useRef(false)
  useEffect(() => {
    if (!ready || printed.current) return
    printed.current = true
    const timer = setTimeout(() => window.print(), 300)
    return () => clearTimeout(timer)
  }, [ready])
}

export function openPrint(path: string, id: string) {
  window.open(`/print/${path}/${encodeURIComponent(id)}`, '_blank')
}

export function PrintToolbarButton() {
  return (
    <button type="button" data-testid="print-button" onClick={() => window.print()}>
      In
    </button>
  )
}
