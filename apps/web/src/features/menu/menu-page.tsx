import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Settings, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinDialog, WinGroupBox, WinInput, WinSelect } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useMenuList, useCreateMenuItem, useUpdateMenuItem, useIngredients } from '@/data'
import type { MenuItemFull } from '@/data'
import { formatCurrency } from '@wms/shared'

const modeLabels: Record<string, { label: string; color: string }> = {
  RECIPE: { label: 'Theo công thức', color: 'bg-blue-100 text-blue-800' },
  DIRECT: { label: 'Bán thẳng', color: 'bg-green-100 text-green-800' },
  NONE: { label: 'Không quản tồn', color: 'bg-gray-100 text-gray-600' },
}

// Trạng thái cấu hình trừ tồn của 1 món
function configStatus(m: MenuItemFull): { text: string; warn: boolean } {
  if (!m.inventoryMode) return { text: '❌ Chưa cấu hình', warn: true }
  if (m.inventoryMode === 'NONE') return { text: 'Không trừ tồn', warn: false }
  if (m.inventoryMode === 'RECIPE')
    return m.recipe
      ? { text: `✅ Công thức (${m.recipe._count.ingredients} NL)`, warn: false }
      : { text: '⚠️ Chưa có công thức', warn: true }
  // DIRECT
  return m.directIngredient ? { text: `✅ ${m.directIngredient.name}`, warn: false } : { text: '⚠️ Chưa chọn NL', warn: true }
}

const columns: Column<MenuItemFull>[] = [
  { key: 'name', header: 'Tên món', width: 200 },
  { key: 'category', header: 'Loại', width: 110 },
  { key: 'price', header: 'Giá', width: 100, align: 'right', render: (r) => formatCurrency(r.price) },
  { key: 'kiotvietProductId', header: 'Mã KiotViet', width: 110, align: 'center', render: (r) => r.kiotvietProductId ?? '-' },
  {
    key: 'inventoryMode',
    header: 'Cách trừ tồn',
    width: 120,
    align: 'center',
    render: (r) =>
      r.inventoryMode ? (
        <span className={`px-2 py-0.5 text-[10px] rounded ${modeLabels[r.inventoryMode]?.color ?? ''}`}>{modeLabels[r.inventoryMode]?.label}</span>
      ) : (
        <span className="text-[10px] text-win-error">— chưa đặt —</span>
      ),
  },
  {
    key: 'recipe',
    header: 'Cấu hình',
    width: 160,
    render: (r) => {
      const s = configStatus(r)
      return <span className={s.warn ? 'text-win-error font-medium' : ''}>{s.text}</span>
    },
  },
]

interface ConfigForm {
  inventory_mode: 'RECIPE' | 'DIRECT' | 'NONE' | ''
  direct_ingredient_id?: string
}

export function MenuPage() {
  const [selected, setSelected] = useState<MenuItemFull | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [cfgOpen, setCfgOpen] = useState(false)

  const { data: menu, isLoading, refetch } = useMenuList()
  const { data: ingRes } = useIngredients({ limit: 1000 })
  const createMutation = useCreateMenuItem()
  const updateMutation = useUpdateMenuItem()

  const ingredientOptions = [
    { value: '', label: '— Chọn nguyên liệu —' },
    ...(ingRes?.data ?? []).map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })),
  ]

  // form thêm món
  const addForm = useForm<{ name: string; price: number; category: string }>()
  // form cấu hình
  const cfgForm = useForm<ConfigForm>()
  const cfgMode = cfgForm.watch('inventory_mode')

  useEffect(() => {
    if (addOpen) addForm.reset({ name: '', price: 0, category: 'Món chính' })
  }, [addOpen, addForm])
  useEffect(() => {
    if (cfgOpen && selected)
      cfgForm.reset({ inventory_mode: selected.inventoryMode ?? '', direct_ingredient_id: selected.directIngredientId ?? '' })
  }, [cfgOpen, selected, cfgForm])

  const onAdd = async (d: { name: string; price: number; category: string }) => {
    await createMutation.mutateAsync({ name: d.name, price: Number(d.price), category: d.category })
    setAddOpen(false)
  }
  const onConfig = async (d: ConfigForm) => {
    if (!selected) return
    await updateMutation.mutateAsync({
      id: selected.id,
      inventory_mode: d.inventory_mode || null,
      direct_ingredient_id: d.inventory_mode === 'DIRECT' ? d.direct_ingredient_id || null : null,
    })
    setCfgOpen(false)
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Thêm món" onClick={() => setAddOpen(true)} />
        <WinToolbar.Button icon={<Settings size={14} />} label="Cấu hình trừ tồn" disabled={!selected} onClick={() => setCfgOpen(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <span className="ml-2 text-[11px] text-win-text-secondary">
          {menu ? `${menu.filter((m) => configStatus(m).warn).length} món chưa cấu hình` : ''}
        </span>
      </WinToolbar>

      <WinDataGrid searchable
        columns={columns}
        data={menu ?? []}
        loading={isLoading}
        onRowClick={setSelected}
        onRowDoubleClick={(r) => {
          setSelected(r)
          setCfgOpen(true)
        }}
        getRowClass={(r) => (configStatus(r).warn ? '!text-win-error' : '')}
        storageKey="menu-items"
      />

      {/* Thêm món */}
      <WinDialog
        title="🆕 Thêm Món"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        width={400}
        footer={
          <>
            <button onClick={addForm.handleSubmit(onAdd)} className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title min-w-[75px] cursor-pointer">
              OK
            </button>
            <button onClick={() => setAddOpen(false)} className="px-4 py-1 text-xs bg-win-button border border-win-button-border min-w-[75px] cursor-pointer hover:bg-win-button-hover">
              Cancel
            </button>
          </>
        }
      >
        <WinGroupBox title="Thông tin món">
          <div className="space-y-2.5">
            <WinInput label="Tên món" {...addForm.register('name', { required: true })} />
            <WinInput label="Giá" type="number" {...addForm.register('price')} />
            <WinInput label="Loại" placeholder="Món chính / Đồ uống..." {...addForm.register('category')} />
          </div>
        </WinGroupBox>
      </WinDialog>

      {/* Cấu hình trừ tồn */}
      <WinDialog
        title={`⚙️ Cấu hình trừ tồn — ${selected?.name ?? ''}`}
        open={cfgOpen}
        onClose={() => setCfgOpen(false)}
        width={440}
        footer={
          <>
            <button onClick={cfgForm.handleSubmit(onConfig)} className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title min-w-[75px] cursor-pointer">
              Lưu
            </button>
            <button onClick={() => setCfgOpen(false)} className="px-4 py-1 text-xs bg-win-button border border-win-button-border min-w-[75px] cursor-pointer hover:bg-win-button-hover">
              Huỷ
            </button>
          </>
        }
      >
        <WinGroupBox title="Cách trừ tồn khi bán món này">
          <div className="space-y-2.5">
            <WinSelect
              label="Cách trừ"
              {...cfgForm.register('inventory_mode')}
              options={[
                { value: '', label: '— Chưa cấu hình —' },
                { value: 'RECIPE', label: 'Theo công thức (món chế biến)' },
                { value: 'DIRECT', label: 'Bán thẳng (1 món = 1 nguyên liệu)' },
                { value: 'NONE', label: 'Không quản tồn' },
              ]}
            />
            {cfgMode === 'DIRECT' && (
              <WinSelect label="Nguyên liệu trừ" {...cfgForm.register('direct_ingredient_id')} options={ingredientOptions} />
            )}
            {cfgMode === 'RECIPE' && (
              <p className="text-[11px] text-win-info">
                💡 Vào trang <b>Công thức</b> để gán nguyên liệu + định lượng cho món này.
                {selected?.recipe ? ` Hiện có ${selected.recipe._count.ingredients} NL.` : ' Hiện chưa có công thức.'}
              </p>
            )}
          </div>
        </WinGroupBox>
      </WinDialog>
    </div>
  )
}
