import { useState } from 'react'
import { Plus, Pencil, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { RecipeForm } from './recipe-form'
import { useRecipes } from '@/data'

interface RecipeRow {
  id: string
  name: string
  menuItem: { name: string }
  ingredients: { ingredientId: string; quantity: string; unit: string }[]
  servingSize: number
  menuItemId: string
}

const columns: Column<RecipeRow>[] = [
  { key: 'menuItem', header: 'Món ăn', width: 180, render: (r) => r.menuItem?.name },
  { key: 'name', header: 'Tên công thức', width: 180 },
  { key: 'ingredients', header: 'Số NL', width: 70, render: (r) => String(r.ingredients?.length || 0) },
  { key: 'servingSize', header: 'Phần', width: 60 },
]

export function RecipesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<RecipeRow | null>(null)
  const [selected, setSelected] = useState<RecipeRow | null>(null)
  const [page, setPage] = useState(1)

  const { data: res, isLoading, refetch } = useRecipes(page)

  const openEdit = (row: RecipeRow) => {
    setEditData(row)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button
          icon={<Plus size={14} />}
          label="Tạo CT"
          onClick={() => {
            setEditData(null)
            setFormOpen(true)
          }}
        />
        <WinToolbar.Button
          icon={<Pencil size={14} />}
          label="Sửa"
          disabled={!selected}
          onClick={() => selected && openEdit(selected)}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <WinDataGrid searchable
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page, limit: 20, total: res?.meta.total ?? 0 }}
        onPageChange={setPage}
        onRowClick={setSelected}
        onRowDoubleClick={openEdit}
      />
      <RecipeForm
        open={formOpen}
        editData={editData}
        onClose={() => {
          setFormOpen(false)
          refetch()
        }}
      />
    </div>
  )
}
