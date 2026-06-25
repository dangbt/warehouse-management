import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Download } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { IngredientForm } from './IngredientForm'
import { api } from '@/services/api'

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
  const [data, setData] = useState<IngredientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [selected, setSelected] = useState<IngredientRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await api.get(`/ingredients?page=${page}&limit=20`)
    setData(res.data)
    setTotal(res.meta.total)
    setLoading(false)
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async (formData: { name: string; unit: string; category: string; cost_per_unit: number; min_stock: number }) => {
    if (formMode === 'add') await api.post('/ingredients', formData)
    else await api.put(`/ingredients/${selected?.id}`, formData)
    fetchData()
  }

  const handleDelete = async () => {
    if (!selected) return
    await api.delete(`/ingredients/${selected.id}`)
    setSelected(null)
    fetchData()
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Thêm" onClick={() => { setFormMode('add'); setSelected(null); setFormOpen(true) }} />
        <WinToolbar.Button icon={<Pencil size={14} />} label="Sửa" disabled={!selected} onClick={() => { setFormMode('edit'); setFormOpen(true) }} />
        <WinToolbar.Button icon={<Trash2 size={14} />} label="Xoá" danger disabled={!selected} onClick={() => setConfirmDelete(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={fetchData} />
        <WinToolbar.Button icon={<Download size={14} />} label="Export" />
      </WinToolbar>

      <WinDataGrid columns={columns} data={data} loading={loading} pagination={{ page, limit: 20, total }} onPageChange={setPage} onRowClick={setSelected} onRowDoubleClick={(row) => { setSelected(row); setFormMode('edit'); setFormOpen(true) }} getRowClass={(r) => Number(r.currentStock) <= Number(r.minStock) ? '!text-win-error' : ''} />

      <IngredientForm open={formOpen} mode={formMode} data={selected} onClose={() => setFormOpen(false)} onSave={handleSave} />
      <WinMessageBox type="question" title="Xác nhận" message={`Bạn có chắc chắn muốn xoá "${selected?.name}"?`} open={confirmDelete} buttons="yes_no" onResult={(r) => { setConfirmDelete(false); if (r === 'yes') handleDelete() }} />
    </div>
  )
}
