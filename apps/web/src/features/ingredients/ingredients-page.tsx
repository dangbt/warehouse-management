import { useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Download } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { IngredientForm } from './ingredient-form'
import { useIngredients, useCreateIngredient, useUpdateIngredient, useDeleteIngredient } from '@/data'

interface IngredientRow {
  id: string
  name: string
  unit: string
  currentStock: string
  minStock: string
  costPerUnit: string
  category: string
}

const columns: Column<IngredientRow>[] = [
  { key: 'name', header: 'Tên nguyên liệu', width: 180 },
  { key: 'unit', header: 'ĐVT', width: 60, align: 'center' },
  {
    key: 'currentStock',
    header: 'Tồn kho',
    width: 80,
    align: 'right',
    render: (r) => (
      <span className={Number(r.currentStock) <= Number(r.minStock) ? 'text-win-error font-bold' : ''}>
        {r.currentStock}
      </span>
    ),
  },
  { key: 'minStock', header: 'Min', width: 60, align: 'right' },
  {
    key: 'costPerUnit',
    header: 'Giá/ĐV',
    width: 100,
    align: 'right',
    render: (r) => `${Number(r.costPerUnit).toLocaleString()}₫`,
  },
  { key: 'category', header: 'Phân loại', width: 80, align: 'center' },
]

export function IngredientsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [selected, setSelected] = useState<IngredientRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: res, isLoading, refetch } = useIngredients({ page, search: search || undefined, category: category || undefined })
  const createMutation = useCreateIngredient()
  const updateMutation = useUpdateIngredient()
  const deleteMutation = useDeleteIngredient()

  const handleSave = async (formData: {
    name: string
    unit: string
    category: string
    cost_per_unit: number
    min_stock: number
  }) => {
    if (formMode === 'add') {
      await createMutation.mutateAsync(formData)
    } else if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, ...formData })
    }
  }

  const handleDelete = () => {
    if (selected) {
      deleteMutation.mutate(selected.id)
      setSelected(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button
          icon={<Plus size={14} />}
          label="Thêm"
          onClick={() => {
            setFormMode('add')
            setSelected(null)
            setFormOpen(true)
          }}
        />
        <WinToolbar.Button
          icon={<Pencil size={14} />}
          label="Sửa"
          disabled={!selected}
          onClick={() => {
            setFormMode('edit')
            setFormOpen(true)
          }}
        />
        <WinToolbar.Button
          icon={<Trash2 size={14} />}
          label="Xoá"
          danger
          disabled={!selected}
          onClick={() => setConfirmDelete(true)}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Button icon={<Download size={14} />} label="Export" />
        <WinToolbar.Separator />
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="border border-win-input-border rounded-sm px-2 py-0.5 text-[11px] w-32 outline-none focus:border-win-input-focus"
        />
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          className="border border-win-input-border rounded-sm px-1 py-0.5 text-[11px] outline-none"
        >
          <option value="">Tất cả loại</option>
          <option value="Thịt">Thịt</option>
          <option value="Rau">Rau</option>
          <option value="Gia vị">Gia vị</option>
          <option value="Đồ khô">Đồ khô</option>
          <option value="Đồ uống">Đồ uống</option>
        </select>
      </WinToolbar>

      <WinDataGrid
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page, limit: 20, total: res?.meta.total ?? 0 }}
        onPageChange={setPage}
        onRowClick={setSelected}
        onRowDoubleClick={(row) => {
          setSelected(row)
          setFormMode('edit')
          setFormOpen(true)
        }}
        getRowClass={(r) => (Number(r.currentStock) <= Number(r.minStock) ? '!text-win-error' : '')}
        storageKey="ingredients"
      />

      <IngredientForm
        open={formOpen}
        mode={formMode}
        data={selected as any}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
      <WinMessageBox
        type="question"
        title="Xác nhận"
        message={`Xoá "${selected?.name}"?`}
        open={confirmDelete}
        buttons="yes_no"
        onResult={(r) => {
          setConfirmDelete(false)
          if (r === 'yes') handleDelete()
        }}
      />
    </div>
  )
}
