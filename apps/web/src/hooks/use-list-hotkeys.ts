import { useHotkeys } from './use-hotkeys'

interface ListHotkeyActions {
  onAdd?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onClone?: () => void
  /** false khi đang mở dialog/form để phím tắt danh sách không chạy chồng. */
  enabled?: boolean
}

/** Focus ô tìm kiếm của WinDataGrid (F3 / Ctrl+F). */
export function focusGridSearch() {
  const el = document.querySelector<HTMLInputElement>('[data-testid="grid-search-input"], [data-hotkey-search]')
  if (!el) return false
  el.focus()
  el.select()
  return true
}

/** Phím tắt chuẩn cho trang danh sách: F2 thêm, F3/Ctrl+F tìm, F4 sửa, Delete xoá, Ctrl+D nhân bản. */
export function useListHotkeys({ onAdd, onEdit, onDelete, onClone, enabled = true }: ListHotkeyActions) {
  useHotkeys(
    [
      ...(onAdd ? [{ keys: 'F2', handler: onAdd }] : []),
      { keys: ['F3', 'Ctrl+F'], handler: () => void focusGridSearch() },
      ...(onEdit ? [{ keys: 'F4', handler: onEdit }] : []),
      ...(onDelete ? [{ keys: 'Delete', handler: onDelete }] : []),
      ...(onClone ? [{ keys: 'Ctrl+D', handler: onClone }] : []),
    ],
    enabled,
  )
}
