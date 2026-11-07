import { lazy, Suspense, useState, type KeyboardEvent } from 'react'
import { Camera } from 'lucide-react'
import { useToastStore } from '@/stores/toast.store'
import { findItemByCode, type ScannedItem } from './lookup'

// Thư viện quét + camera chỉ tải khi người dùng bấm "Quét" lần đầu.
const ScanDialog = lazy(() => import('./scan-dialog'))

interface Props {
  /** Gọi khi mã khớp một hàng. Trả về chuỗi để hiện trong hộp quét camera (vd "+1 SL"). */
  onItem: (item: ScannedItem) => string | void
  disabled?: boolean
}

/**
 * Ô nhập mã (máy quét cầm tay gõ nhanh + Enter) và nút mở camera.
 * Mã không có trong danh mục → báo rõ bằng toast, không thêm gì.
 */
export function ScanControls({ onItem, disabled }: Props) {
  const [text, setText] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)

  const handleCode = async (code: string): Promise<string> => {
    try {
      const item = await findItemByCode(code)
      if (!item) {
        const msg = `Không tìm thấy mã "${code}" trong danh mục`
        useToastStore.getState().error(msg)
        return msg
      }
      return onItem(item) || item.name
    } catch {
      const msg = 'Không tra được mã, thử lại'
      useToastStore.getState().error(msg)
      return msg
    }
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault() // tránh submit form khi máy quét gửi Enter
    const code = text
    setText('')
    if (code.trim()) void handleCode(code)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        inputMode="text"
        data-testid="scan-input"
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder="Quét/nhập mã vạch + Enter"
        className="h-9 w-48 border border-win-input-border px-2 text-[14px] bg-white outline-none focus:border-win-input-focus disabled:bg-win-control"
      />
      <button
        type="button"
        data-testid="scan-camera"
        disabled={disabled}
        onClick={() => setCameraOpen(true)}
        className="flex items-center gap-1.5 h-9 px-3 text-[14px] border border-win-active-title text-win-active-title bg-white hover:bg-win-menu-hover cursor-pointer disabled:opacity-50"
      >
        <Camera size={16} /> Quét
      </button>
      {cameraOpen && (
        <Suspense fallback={null}>
          <ScanDialog open={cameraOpen} onClose={() => setCameraOpen(false)} onCode={handleCode} />
        </Suspense>
      )}
    </div>
  )
}
