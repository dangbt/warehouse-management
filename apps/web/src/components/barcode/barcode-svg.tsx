import { encodeBarcode } from '@/utils/barcode'

interface Props {
  value: string
  /** Chiều cao vạch (đơn vị viewBox). */
  height?: number
  className?: string
}

const QUIET = 10 // vùng yên tĩnh 10 module mỗi bên để máy quét nhận được

/** Mã vạch dạng SVG vector (in nét, không mờ), co giãn theo chiều rộng của khung chứa. */
export function BarcodeSvg({ value, height = 40, className }: Props) {
  let modules: string
  try {
    modules = encodeBarcode(value)
  } catch {
    return <span className="text-win-error text-[11px]">Mã không in được: {value}</span>
  }
  const runs: string[] = []
  for (let i = 0; i < modules.length; ) {
    let j = i
    while (j < modules.length && modules[j] === modules[i]) j++
    if (modules[i] === '1') runs.push(`M${i + QUIET} 0h${j - i}v${height}h-${j - i}z`)
    i = j
  }
  const width = modules.length + QUIET * 2
  return (
    <svg
      role="img"
      aria-label={`Mã vạch ${value}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={width} height={height} fill="#fff" />
      <path d={runs.join('')} fill="#000" />
    </svg>
  )
}
