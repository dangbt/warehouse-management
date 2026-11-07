import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { startCameraScan } from './camera-scanner'

interface Props {
  open: boolean
  onClose: () => void
  /** Gọi mỗi khi quét ra một mã. Trả về thông báo ngắn để hiện dưới khung hình (vd "+1 Thịt bò"). */
  onCode: (code: string) => Promise<string | void> | string | void
}

/** Hộp thoại quét bằng camera (mobile-friendly, toàn màn hình trên điện thoại). Quét liên tục tới khi đóng. */
export default function ScanDialog({ open, onClose, onCode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState('Đang mở camera...')
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode

  useEffect(() => {
    if (!open || !videoRef.current) return
    let stopped = false
    let stop: (() => void) | undefined
    startCameraScan(videoRef.current, async (code) => {
      const msg = await onCodeRef.current(code)
      if (!stopped) setStatus(msg || code)
    })
      .then((s) => {
        if (stopped) s()
        else {
          stop = s
          setStatus('Hướng camera vào mã vạch')
        }
      })
      .catch((e: unknown) => {
        if (!stopped) setStatus(e instanceof Error ? e.message : 'Không mở được camera')
      })
    return () => {
      stopped = true
      stop?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-0 sm:p-4" data-testid="scan-dialog">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-md flex flex-col">
        <div className="flex items-center justify-between px-3 h-11 border-b border-win-grid-border">
          <strong className="text-[14px]">Quét mã vạch</strong>
          <button type="button" aria-label="Đóng" onClick={onClose} className="p-2 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <video ref={videoRef} muted playsInline className="w-full flex-1 sm:flex-none sm:aspect-[4/3] bg-black object-cover" />
        <p className="px-3 py-2 text-[14px] text-center" data-testid="scan-status">
          {status}
        </p>
      </div>
    </div>
  )
}
