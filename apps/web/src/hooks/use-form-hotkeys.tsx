import { useCallback, useState, type ReactNode } from 'react'
import { WinMessageBox } from '@wms/ui-winforms'
import { useHotkeys } from './use-hotkeys'

interface FormHotkeyActions {
  open: boolean
  isDirty: boolean
  onClose: () => void
  onSave?: () => void
  onSaveNew?: () => void
  onAddRow?: () => void
  onRemoveRow?: () => void
}

/**
 * Phím tắt cho form/dialog: Ctrl+S lưu, Ctrl+Shift+S lưu & thêm mới, Esc đóng (hỏi nếu có thay đổi chưa lưu),
 * Ctrl+Insert thêm dòng, Ctrl+Delete xoá dòng. Trả về `guard` (render trong form) để hiện hộp xác nhận.
 */
export function useFormHotkeys({ open, isDirty, onClose, onSave, onSaveNew, onAddRow, onRemoveRow }: FormHotkeyActions): {
  requestClose: () => void
  guard: ReactNode
} {
  const [confirming, setConfirming] = useState(false)

  const requestClose = useCallback(() => {
    if (isDirty) setConfirming(true)
    else onClose()
  }, [isDirty, onClose])

  useHotkeys(
    [
      ...(onSaveNew ? [{ keys: 'Ctrl+Shift+S', handler: onSaveNew }] : []),
      ...(onSave ? [{ keys: 'Ctrl+S', handler: onSave }] : []),
      { keys: 'Escape', allowInInput: true, handler: requestClose },
      ...(onAddRow ? [{ keys: 'Ctrl+Insert', handler: onAddRow }] : []),
      ...(onRemoveRow ? [{ keys: 'Ctrl+Delete', handler: onRemoveRow }] : []),
    ],
    open && !confirming,
  )

  const guard = (
    <WinMessageBox
      type="question"
      title="Xác nhận"
      message="Có thay đổi chưa lưu. Đóng và bỏ thay đổi?"
      open={open && confirming}
      buttons="yes_no"
      onResult={(r) => {
        setConfirming(false)
        if (r === 'yes') onClose()
      }}
    />
  )
  return { requestClose, guard }
}
