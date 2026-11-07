import { useState } from 'react'
import { Grid3x3 } from 'lucide-react'
import { useFeatures } from '@/data/use-features'
import { MatrixPicker } from './matrix-picker'
import type { MatrixLine, MatrixMode } from './matrix-logic'

/** Nút "Thêm theo sản phẩm" + popup ma trận; chỉ hiện khi bật flag product_variants (FNB không thấy). */
export function MatrixAddButton({ mode, onConfirm, disabled }: { mode: MatrixMode; onConfirm: (lines: MatrixLine[]) => void; disabled?: boolean }) {
  const { flags } = useFeatures()
  const [open, setOpen] = useState(false)
  if (flags?.product_variants !== true) return null // `?.`: phản hồi flags chưa đủ (đang tải/lỗi) coi như tắt
  return (
    <>
      <button
        type="button"
        data-testid="matrix-add"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-9 px-3 text-[14px] border border-win-active-title text-win-active-title bg-white hover:bg-win-menu-hover cursor-pointer disabled:opacity-50"
      >
        <Grid3x3 size={16} /> Thêm theo sản phẩm
      </button>
      <MatrixPicker open={open} mode={mode} onClose={() => setOpen(false)} onConfirm={onConfirm} />
    </>
  )
}
