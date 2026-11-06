import type { ProductAttribute } from '@/data/use-products'

interface Props {
  attributes: ProductAttribute[]
  /** attributeId → các valueId đã chọn */
  selected: Record<string, string[]>
  onToggle: (attributeId: string, valueId: string) => void
}

/** Chọn thuộc tính + giá trị bằng chip: thuộc tính không chọn giá trị nào = không dùng làm trục biến thể. */
export function AttributePicker({ attributes, selected, onToggle }: Props) {
  if (attributes.length === 0) return <p className="text-win-base text-win-text-secondary">Chưa có thuộc tính — tạo ở trang Thuộc tính trước.</p>
  return (
    <div className="space-y-2">
      {attributes.map((a) => (
        <div key={a.id} className="flex items-start gap-2" data-testid={`attr-${a.code}`}>
          <span className="w-20 shrink-0 text-win-base pt-1 text-right">{a.name}:</span>
          <div className="flex flex-wrap gap-1.5">
            {a.values.map((v) => {
              const on = selected[a.id]?.includes(v.id)
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={!!on}
                  onClick={() => onToggle(a.id, v.id)}
                  className={`px-2.5 py-0.5 text-win-base border rounded-full cursor-pointer ${
                    on ? 'bg-win-active-title text-white border-win-active-title' : 'bg-white border-win-input-border hover:bg-win-menu-hover'
                  }`}
                >
                  {v.value}
                </button>
              )
            })}
            {a.values.length === 0 && <span className="text-win-xs text-win-text-secondary pt-1">Chưa có giá trị</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
