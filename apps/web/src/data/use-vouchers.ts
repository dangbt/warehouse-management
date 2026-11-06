import { useEffect, useState } from 'react'
import { api } from '@/services/api'

export type VoucherType = 'IMPORT' | 'EXPORT' | 'RETURN' | 'STOCKTAKE' | 'PROCESSING'

/** Hôm nay dạng YYYY-MM-DD theo giờ máy (giờ VN) — giá trị mặc định của ô Ngày chứng từ. */
export function todayInputValue(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Ngày chọn (YYYY-MM-DD, giờ địa phương) → ISO UTC của 00:00 ngày đó (client gửi biên UTC). */
export function voucherDateToIso(day: string): string | undefined {
  if (!day) return undefined
  const d = new Date(`${day}T00:00:00`)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

export interface VoucherPayload {
  voucher_date?: string
  voucher_no?: string
}

export interface VoucherFieldsState {
  date: string
  no: string
  setDate: (v: string) => void
  setNo: (v: string) => void
  /** Phần payload gửi API: voucher_date (ISO UTC) + voucher_no (bỏ trống ⇒ server tự sinh). */
  payload: () => VoucherPayload
}

/** State Ngày CT + Số CT của form; mỗi lần mở form lấy lại số chứng từ tiếp theo để prefill. */
export function useVoucherFields(type: VoucherType, open: boolean): VoucherFieldsState {
  const [date, setDate] = useState(todayInputValue)
  const [no, setNo] = useState('')

  useEffect(() => {
    if (!open) return
    setDate(todayInputValue())
    setNo('')
    let cancelled = false
    api
      .get(`/vouchers/next-no?type=${type}`)
      .then((res: { voucherNo?: string }) => {
        if (!cancelled && typeof res?.voucherNo === 'string') setNo(res.voucherNo)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open, type])

  return {
    date,
    no,
    setDate,
    setNo,
    payload: () => ({ voucher_date: voucherDateToIso(date), voucher_no: no.trim() || undefined }),
  }
}
