import { WinInput } from '@wms/ui-winforms'
import type { VoucherFieldsState } from '@/data/use-vouchers'

/** Hai ô Ngày chứng từ + Số chứng từ dùng chung cho form nhập/xuất/trả/kiểm kê/chế biến. */
export function VoucherFields({ date, no, setDate, setNo }: Pick<VoucherFieldsState, 'date' | 'no' | 'setDate' | 'setNo'>) {
  return (
    <>
      <WinInput label="Ngày chứng từ" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <WinInput label="Số chứng từ" value={no} onChange={(e) => setNo(e.target.value)} placeholder="Tự động" />
    </>
  )
}
