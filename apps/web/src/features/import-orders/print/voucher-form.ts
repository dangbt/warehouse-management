export type VoucherForm = 'TT133' | 'TT200'

export const VOUCHER_FORMS: { value: VoucherForm; label: string; legalNote: string }[] = [
  { value: 'TT133', label: 'TT133/2016/TT-BTC', legalNote: '(Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính)' },
  { value: 'TT200', label: 'TT200/2014/TT-BTC', legalNote: '(Ban hành theo Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính)' },
]

const STORAGE_KEY = 'print-voucher-form'

export function loadVoucherForm(): VoucherForm {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'TT200' ? 'TT200' : 'TT133'
  } catch {
    return 'TT133'
  }
}

export function saveVoucherForm(form: VoucherForm) {
  try {
    localStorage.setItem(STORAGE_KEY, form)
  } catch {
    /* localStorage không khả dụng: bỏ qua, chỉ mất ghi nhớ lựa chọn */
  }
}

/** Mở tab mới tới trang in phiếu nhập (trang tự gọi window.print). */
export function openImportOrderPrint(id: string) {
  window.open(`/print/import-orders/${encodeURIComponent(id)}`, '_blank')
}
