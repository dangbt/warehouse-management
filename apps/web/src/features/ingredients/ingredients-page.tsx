import { useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Download } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { IngredientForm } from './ingredient-form'
import { useIngredients, useDeleteIngredient } from '@/data'

interface IngredientRow { id: string; name: string; unit: string; currentStock: string; minStock: string; costPerUnit: string; category: string }

const columns: Column<IngredientRow>[] = [
  { key: 'name', header: 'Tên nguyên liệu', width: 180 },
  { key: 'unit', header: 'ĐVT', width: 60 },
  { key: 'currentStock', header: 'Tồn kho', width: 80, render: (r) => <span className={Number(r.currentStock) <= Number(r.minStock) ? 'text-win-error font-bold' : ''}>{r.currentStock}</span> },
  { key: 'minStock', header: 'Min', width: 60 },
  { key: 'costPerUnit', header: 'Giá/ĐV', width: 100, render: (r) => `${Number(r.costPerUnit).toLocaleString()}₫` },
  { key: 'category', header: 'Phân loại', width: 80 },
]

export function IngredientsPage() {
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [selected, setSelected] = useState<IngredientRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: res, isLoading, refetch } = useIngredients({ page })
  const deleteMutation = useDeleteIngredient()

  const handleDelete = () => { if (selected) { deleteMutation.mutate(selected.id); setSelected(null) } }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Thêm" onClick={() => { setFormMode('add'); setSelected(null); setFormOpen(true) }} />
        <WinToolbar.Button icon={<Pencil size={14} />} label="Sửa" disabled={!selected} onClick={() => { setFormMode('edit'); setFormOpen(true) }} />
        <WinToolbar.Button icon={<Trash2 size={14} />} label="Xoá" danger disabled={!selected} onClick={() => setConfirmDelete(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Button icon={<Download size={14} />} label="Export" />
      </WinToolbar>

      <WinDataGrid columns={columns} data={res?.data ?? []} loading={isLoading} pagination={{ page, limit: 20, total: res?.meta.total ?? 0 }} onPageChange={setPage} onRowClick={setSelected} onRowDoubleClick={(row) => { setSelected(row); setFormMode('edit'); setFormOpen(true) }} getRowClass={(r) => Number(r.currentStock) <= Number(r.minStock) ? '!text-win-error' : ''} />

      <IngredientForm open={formOpen} mode={formMode} data={selected as any} onClose={() => setFormOpen(false)} />
      <WinMessageBox type="question" title="Xác nhận" message={`Xoá "${selected?.name}"?`} open={confirmDelete} buttons="yes_no" onResult={(r) => { setConfirmDelete(false); if (r === 'yes') handleDelete() }} />
    </div>
  )
}
