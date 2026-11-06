import { useState } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { WinGroupBox } from '@wms/ui-winforms'
import { attributeApi, useAttributeMutation, useProductAttributes } from '@/data/use-products'
import type { AttributeValue, ProductAttribute } from '@/data/use-products'

/** Đổi chỗ phần tử `from` → vị trí `to` (hàm thuần, dùng cho kéo thả). */
export function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

const btn = 'px-3 h-7 text-win-base bg-win-button border border-win-button-border cursor-pointer hover:bg-win-button-hover disabled:opacity-50'

function ValueList({ attr }: { attr: ProductAttribute }) {
  const [newValue, setNewValue] = useState('')
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const add = useAttributeMutation(attributeApi.addValue)
  const sort = useAttributeMutation(attributeApi.updateValue)
  const remove = useAttributeMutation(attributeApi.removeValue)

  const drop = (to: number) => {
    if (dragFrom === null || dragFrom === to) return
    // Ghi lại thứ tự mới: mỗi giá trị nhận sort = vị trí (chỉ gửi những giá trị đổi chỗ)
    reorder(attr.values, dragFrom, to).forEach((v: AttributeValue, i) => {
      if (v.sort !== i) sort.mutate({ id: v.id, sort: i })
    })
    setDragFrom(null)
  }

  const submit = () => {
    if (!newValue.trim()) return
    add.mutate({ id: attr.id, value: newValue.trim(), sort: attr.values.length }, { onSuccess: () => setNewValue('') })
  }

  return (
    <div>
      <ul className="space-y-1 mb-2">
        {attr.values.map((v, i) => (
          <li
            key={v.id}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(i)}
            className="flex items-center gap-2 px-2 py-1 border border-win-grid-border bg-white"
            data-testid={`value-${attr.code}`}
          >
            <GripVertical size={14} className="cursor-grab text-win-text-secondary" aria-label="Kéo để đổi thứ tự" />
            <span className="flex-1">{v.value}</span>
            <span className="text-win-xs text-win-text-secondary">{v.code}</span>
            <button type="button" aria-label={`Xoá ${v.value}`} onClick={() => remove.mutate(v.id)} className="cursor-pointer text-win-error">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Thêm giá trị..."
          aria-label={`Giá trị mới của ${attr.name}`}
          className="flex-1 h-7 px-2 border border-win-input-border text-win-base"
        />
        <button type="button" className={btn} onClick={submit} disabled={!newValue.trim()}>
          Thêm
        </button>
      </div>
    </div>
  )
}

export function AttributesPage() {
  const { data: attrs = [] } = useProductAttributes()
  const [name, setName] = useState('')
  const create = useAttributeMutation(attributeApi.create, 'Đã thêm thuộc tính')
  const removeAttr = useAttributeMutation(attributeApi.remove, 'Đã xoá thuộc tính')

  const submit = () => {
    if (!name.trim()) return
    create.mutate({ name: name.trim(), sort: attrs.length }, { onSuccess: () => setName('') })
  }

  return (
    <div className="p-3 overflow-auto h-full">
      <div className="flex gap-2 mb-3 max-w-md">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Tên thuộc tính (vd Size, Màu)"
          aria-label="Tên thuộc tính mới"
          className="flex-1 h-8 px-2 border border-win-input-border text-win-base"
        />
        <button type="button" className={btn} onClick={submit} disabled={!name.trim()}>
          <Plus size={14} className="inline -mt-0.5" /> Thêm thuộc tính
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {attrs.map((a) => (
          <WinGroupBox key={a.id} title={`${a.name} (${a.code})`}>
            <ValueList attr={a} />
            <button type="button" className={`${btn} mt-2 text-win-error`} onClick={() => removeAttr.mutate(a.id)}>
              Xoá thuộc tính
            </button>
          </WinGroupBox>
        ))}
        {attrs.length === 0 && <p className="text-win-text-secondary">Chưa có thuộc tính nào.</p>}
      </div>
    </div>
  )
}
