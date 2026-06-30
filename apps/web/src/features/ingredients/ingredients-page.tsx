import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Pencil, Trash2, RefreshCw, Download } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox, WinGroupBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { IngredientForm } from './ingredient-form'
import { useIngredients, useCreateIngredient, useUpdateIngredient, useDeleteIngredient, useIngredientBatches } from '@/data'
import type { Batch } from '@/data/use-batches'
import { formatDate, formatCurrency, formatNumber } from '@wms/shared'
import { Route } from '@/routes/_app/ingredients'

interface IngredientRow {
  id: string
  name: string
  unit: string
  currentStock: string
  minStock: string
  costPerUnit: string
  category: string
  trackStock: boolean
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
      <span className={Number(r.currentStock) <= Number(r.minStock) ? 'text-win-error font-bold' : ''}>{formatNumber(r.currentStock)}</span>
    ),
  },
  { key: 'minStock', header: 'Min', width: 60, align: 'right', render: (r) => formatNumber(r.minStock) },
  {
    key: 'costPerUnit',
    header: 'Giá/ĐV',
    width: 100,
    align: 'right',
    render: (r) => formatCurrency(r.costPerUnit),
  },
  { key: 'category', header: 'Phân loại', width: 80, align: 'center' },
  { key: 'trackStock', header: 'Quản tồn', width: 70, align: 'center', render: (r) => r.trackStock ? '✓' : '—' },
]

export function IngredientsPage() {
  const { page, search, category, orderBy, sort } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const setParams = (updates: Record<string, unknown>) => {
    navigate({ search: (prev) => ({ ...prev, ...updates }) })
  }
  const setPage = (p: number) => setParams({ page: p })

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [selected, setSelected] = useState<IngredientRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: res, isLoading, refetch } = useIngredients({ page, search: search || undefined, category: category || undefined, orderBy, sort })
  const createMutation = useCreateIngredient()
  const updateMutation = useUpdateIngredient()
  const deleteMutation = useDeleteIngredient()

  const handleSave = async (formData: {
    name: string
    unit: string
    category: string
    cost_per_unit: number
    min_stock: number
    group_id?: string | null
    base_factor?: number | null
    source_ingredient_id?: string | null
    yield_ratio?: number | null
    loss_ratio?: number | null
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
        <WinToolbar.Button icon={<Trash2 size={14} />} label="Xoá" danger disabled={!selected} onClick={() => setConfirmDelete(true)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Button icon={<Download size={14} />} label="Export" />
        <WinToolbar.Separator />
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => setParams({ search: e.target.value, page: 1 })}
          className="border border-win-input-border px-2 py-0.5 text-[11px] w-32 outline-none focus:border-win-input-focus bg-white"
        />
        <select
          value={category}
          onChange={(e) => setParams({ category: e.target.value, page: 1 })}
          className="border border-win-input-border px-1 py-0.5 text-[11px] outline-none bg-white"
        >
          <option value="">Tất cả loại</option>
          <option value="Thịt">Thịt</option>
          <option value="Rau">Rau</option>
          <option value="Gia vị">Gia vị</option>
          <option value="Đồ khô">Đồ khô</option>
          <option value="Đồ uống">Đồ uống</option>
        </select>
      </WinToolbar>

      <WinDataGrid searchable
        onSearch={(q) => setParams({ search: q, page: 1 })}
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page, limit: 20, total: res?.meta.total ?? 0 }}
        onPageChange={setPage}
        onSort={(field, dir) => setParams({ orderBy: field, sort: dir, page: 1 })}
        onRowClick={setSelected}
        onRowDoubleClick={(row) => {
          setSelected(row)
          setFormMode('edit')
          setFormOpen(true)
        }}
        getRowClass={(r) => (Number(r.currentStock) <= Number(r.minStock) ? '!text-win-error' : '')}
        storageKey="ingredients"
      />

      <IngredientForm open={formOpen} mode={formMode} data={selected as any} onClose={() => setFormOpen(false)} onSave={handleSave} />
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

      {selected && <BatchesPanel ingredientId={selected.id} />}
    </div>
  )
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate).getTime() - Date.now() < SEVEN_DAYS_MS
}

const batchColumns: Column<Batch>[] = [
  { key: 'batchCode', header: 'Mã lô', width: 120 },
  { key: 'costPerUnit', header: 'Giá/ĐV', width: 100, align: 'right', render: (r) => formatCurrency(r.costPerUnit) },
  { key: 'quantity', header: 'Số lượng', width: 80, align: 'right', render: (r) => formatNumber(r.quantity) },
  {
    key: 'expiryDate',
    header: 'HSD',
    width: 100,
    render: (r) =>
      r.expiryDate ? (
        <span className={isExpiringSoon(r.expiryDate) ? 'text-win-error font-bold' : ''}>
          {formatDate(r.expiryDate)}
          {isExpiringSoon(r.expiryDate) ? ' ⚠️' : ''}
        </span>
      ) : (
        '-'
      ),
  },
  {
    key: 'status',
    header: 'Trạng thái',
    width: 100,
    align: 'center',
    render: (r) => {
      const colors: Record<string, string> = {
        ACTIVE: 'bg-green-100 text-green-800',
        EXPIRED: 'bg-red-100 text-red-800',
        DEPLETED: 'bg-gray-100 text-gray-600',
      }
      const labels: Record<string, string> = { ACTIVE: 'Còn hàng', EXPIRED: 'Hết hạn', DEPLETED: 'Đã hết' }
      return <span className={`px-2 py-0.5 text-[10px] rounded ${colors[r.status] ?? ''}`}>{labels[r.status] ?? r.status}</span>
    },
  },
]

function BatchesPanel({ ingredientId }: { ingredientId: string }) {
  const { data: batches, isLoading } = useIngredientBatches(ingredientId)

  return (
    <div className="border-t border-win-grid-border max-h-[200px] overflow-auto">
      <WinGroupBox title="📦 Lô hàng">
        <WinDataGrid columns={batchColumns} data={batches ?? []} loading={isLoading} storageKey="ingredient-batches" />
      </WinGroupBox>
    </div>
  )
}
