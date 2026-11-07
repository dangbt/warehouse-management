import { useState } from 'react'
import { Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from '@/data/use-warehouses'
import type { Warehouse, WarehouseInput } from '@/data/use-warehouses'
import { WarehouseForm } from './warehouse-form'

const columns: Column<Warehouse>[] = [
  { key: 'code', header: 'Mã kho', width: 120 },
  { key: 'name', header: 'Tên kho', width: 220 },
  { key: 'address', header: 'Địa chỉ', width: 260, render: (r) => r.address ?? '' },
  { key: 'isDefault', header: 'Mặc định', width: 90, align: 'center', render: (r) => (r.isDefault ? '★' : '') },
  { key: 'active', header: 'Trạng thái', width: 110, align: 'center', render: (r) => (r.active ? 'Hoạt động' : 'Ngừng') },
]

export function WarehousesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [mode, setMode] = useState<'add' | 'edit'>('add')
  const [selected, setSelected] = useState<Warehouse | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: warehouses, isLoading, refetch } = useWarehouses()
  const createMutation = useCreateWarehouse()
  const updateMutation = useUpdateWarehouse()
  const deleteMutation = useDeleteWarehouse()

  const openEdit = (w: Warehouse) => {
    setSelected(w)
    setMode('edit')
    setFormOpen(true)
  }

  const save = async (v: WarehouseInput) => {
    if (mode === 'add') await createMutation.mutateAsync(v)
    else if (selected) await updateMutation.mutateAsync({ id: selected.id, ...v })
    setFormOpen(false)
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button
          icon={<Plus size={16} />}
          label="Thêm"
          onClick={() => {
            setMode('add')
            setSelected(null)
            setFormOpen(true)
          }}
        />
        <WinToolbar.Button icon={<Pencil size={16} />} label="Sửa" disabled={!selected} onClick={() => selected && openEdit(selected)} />
        <WinToolbar.Button
          icon={<Star size={16} />}
          label="Đặt mặc định"
          disabled={!selected || selected.isDefault}
          onClick={() => selected && updateMutation.mutate({ id: selected.id, is_default: true })}
        />
        <WinToolbar.Button
          icon={<Trash2 size={16} />}
          label="Xoá"
          disabled={!selected || selected.isDefault}
          onClick={() => setConfirmDelete(true)}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={16} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>

      <WinDataGrid
        searchable
        columns={columns}
        data={warehouses ?? []}
        loading={isLoading}
        onRowClick={setSelected}
        onRowDoubleClick={openEdit}
        storageKey="warehouses"
      />

      <WarehouseForm open={formOpen} mode={mode} data={selected} onClose={() => setFormOpen(false)} onSave={save} />
      <WinMessageBox
        type="question"
        title="Xác nhận"
        message={`Xoá kho "${selected?.name}"?`}
        open={confirmDelete}
        buttons="yes_no"
        onResult={(r) => {
          setConfirmDelete(false)
          if (r === 'yes' && selected) {
            deleteMutation.mutate(selected.id)
            setSelected(null)
          }
        }}
      />
    </div>
  )
}
