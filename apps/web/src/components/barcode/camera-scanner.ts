/** Tối thiểu của BarcodeDetector API (chưa có trong lib.dom của TypeScript). */
interface DetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
type DetectorCtor = new (opts?: { formats?: string[] }) => DetectorLike

const SAME_CODE_COOLDOWN_MS = 1500
const POLL_MS = 200

/** Chặn quét lặp: cùng một mã trong khoảng ngắn chỉ tính một lần (camera thấy mã liên tục). */
export function makeDebouncer(cooldownMs = SAME_CODE_COOLDOWN_MS, now: () => number = Date.now) {
  let last = ''
  let at = 0
  return (code: string): boolean => {
    const t = now()
    if (code === last && t - at < cooldownMs) return false
    last = code
    at = t
    return true
  }
}

async function openStream(video: HTMLVideoElement): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Trình duyệt không hỗ trợ camera (cần HTTPS)')
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
  video.srcObject = stream
  await video.play().catch(() => undefined)
  return stream
}

/**
 * Bắt đầu quét bằng camera. Dùng BarcodeDetector khi trình duyệt có (nhẹ, không tải thêm gì);
 * nếu không thì tải @zxing/browser theo yêu cầu (dynamic import → không vào bundle chính).
 * Trả về hàm dừng + giải phóng camera.
 */
export async function startCameraScan(video: HTMLVideoElement, onCode: (code: string) => void): Promise<() => void> {
  const accept = makeDebouncer()
  const Detector = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector

  if (Detector) {
    const stream = await openStream(video)
    const detector = new Detector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a', 'qr_code'] })
    let alive = true
    const tick = async () => {
      while (alive) {
        try {
          const found = await detector.detect(video)
          const code = found[0]?.rawValue
          if (code && accept(code)) onCode(code)
        } catch {
          /* khung hình chưa sẵn sàng — thử lại */
        }
        await new Promise((r) => setTimeout(r, POLL_MS))
      }
    }
    void tick()
    return () => {
      alive = false
      stream.getTracks().forEach((t) => t.stop())
    }
  }

  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const reader = new BrowserMultiFormatReader()
  const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, video, (result) => {
    const code = result?.getText()
    if (code && accept(code)) onCode(code)
  })
  return () => controls.stop()
}
