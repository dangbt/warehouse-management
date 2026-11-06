import type { KeyboardEvent } from 'react'

const FIELD_SELECTOR = 'input:not([type=hidden]):not([type=checkbox]):not([disabled]), select:not([disabled])'

/**
 * Enter trong lưới hàng tiền nhảy sang ô nhập kế tiếp; ở ô cuối của dòng cuối thì gọi `onAddRow`
 * rồi focus ô đầu của dòng mới. Gắn vào `onKeyDown` của vùng chứa bảng (bỏ qua phím đã bị xử lý ở ô con).
 */
export function useGridEnterNav(onAddRow: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.shiftKey || e.ctrlKey || e.metaKey) return
    const target = e.target as HTMLElement
    if (!target.matches(FIELD_SELECTOR)) return
    const container = e.currentTarget
    const fields = Array.from(container.querySelectorAll<HTMLElement>(FIELD_SELECTOR))
    const idx = fields.indexOf(target)
    if (idx < 0) return
    e.preventDefault()
    if (idx < fields.length - 1) {
      fields[idx + 1].focus()
      return
    }
    const before = fields.length
    onAddRow()
    setTimeout(() => {
      const after = Array.from(container.querySelectorAll<HTMLElement>(FIELD_SELECTOR))
      after[Math.min(before, after.length - 1)]?.focus()
    }, 0)
  }
}
