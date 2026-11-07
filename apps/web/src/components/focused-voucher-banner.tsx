import { X } from 'lucide-react'

/** Thanh báo đang lọc đúng 1 chứng từ (mở từ Thẻ kho); bấm để xem lại toàn bộ danh sách. */
export function FocusedVoucherBanner({ label, onClear }: { label?: string; onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border-b text-win-base shrink-0">
      <span>Đang xem chứng từ gốc{label ? <strong> {label}</strong> : null}</span>
      <button type="button" className="ml-auto flex items-center gap-1 text-win-link underline" onClick={onClear}>
        <X size={12} /> Xem tất cả
      </button>
    </div>
  )
}
