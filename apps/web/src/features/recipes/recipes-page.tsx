import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { RecipeForm } from './recipe-form'
import { api } from '@/services/api'

interface RecipeRow { id: string; name: string; menuItem: { name: string }; ingredients: { ingredientId: string; quantity: string; unit: string }[]; servingSize: number; menuItemId: string }

const columns: Column<RecipeRow>[] = [
  { key: 'menuItem', header: 'Món ăn', width: 180, render: (r) => r.menuItem?.name },
  { key: 'name', header: 'Tên công thức', width: 180 },
  { key: 'ingredients', header: 'Số NL', width: 70, render: (r) => String(r.ingredients?.length || 0) },
  { key: 'servingSize', header: 'Phần', width: 60 },
]

export function RecipesPage() {
  const [data, setData] = useState<RecipeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<RecipeRow | null>(null)
  const [selected, setSelected] = useState<RecipeRow | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await api.get('/recipes?limit=50')
    setData(res.data); setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openEdit = (row: RecipeRow) => {
    setEditData(row)
    setFormOpen(true)
  }

  const handleSave = async (d: { menu_item: string; name: string; serving_size: number; ingredients: { ingredient_id: string; quantity: number; unit: string }[] }) => {
    const payload = { menu_item_id: d.menu_item, name: d.name, serving_size: d.serving_size, ingredients: d.ingredients.map((i) => ({ ingredient_id: i.ingredient_id, quantity: i.quantity, unit: i.unit })) }
    if (editData) {
      await api.put(`/recipes/${editData.id}`, payload)
    } else {
      await api.post('/recipes', payload)
    }
    fetchData()
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={14} />} label="Tạo CT" onClick={() => { setEditData(null); setFormOpen(true) }} />
        <WinToolbar.Button icon={<Pencil size={14} />} label="Sửa" disabled={!selected} onClick={() => selected && openEdit(selected)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={fetchData} />
      </WinToolbar>
      <WinDataGrid columns={columns} data={data} loading={loading} pagination={{ page: 1, limit: 50, total: data.length }} onRowClick={setSelected} onRowDoubleClick={openEdit} />
      <RecipeForm open={formOpen} editData={editData} onClose={() => { setFormOpen(false); fetchData() }} onSave={handleSave} />
    </div>
  )
}
