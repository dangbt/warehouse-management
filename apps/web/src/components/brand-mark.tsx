import type { Branding } from '@/data/use-branding'

/** Logo tròn ở thanh tiêu đề: ảnh từ cấu hình; Mâm Vị mặc định giữ nguyên huy hiệu "MV". */
export function BrandMark({ brand }: { brand: Branding }) {
  if (brand.logoUrl && brand.logoUrl !== '/logo.svg') {
    return <img src={brand.logoUrl} alt={brand.name} className="h-6 w-6 mr-2 shrink-0 object-contain" />
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-6 w-6 mr-2 shrink-0">
      <circle cx="16" cy="16" r="14" fill="white" />
      <text x="16" y="21" fontFamily="serif" fontSize="13" fill="#D4451A" textAnchor="middle" fontWeight="bold">
        {brand.shortName}
      </text>
    </svg>
  )
}
