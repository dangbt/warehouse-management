import { useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinMessageBox } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import type { Supplier } from '@/types'
import { SupplierForm } from './supplier-form'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/data'

const columns: Column<Supplier>[] = [
  { key: 'name', header: 'Tên NCC', width: 180 },
  { key: 'phone', header: 'Điện thoại', width: 120 },
  { key: 'address', header: 'Địa chỉ', width: 250 },
  { key: 'note', header: 'Ghi chú', width: 150 },
]

export function SuppliersPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: res, isLoading, refetch } = useSuppliers()
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const deleteMutation = useDeleteSupplier()

  const handleSave = async (formData: { name: string; phone: string; address: string; note?: string }) => {
    if (formMode === 'add') {
      await createMutation.mutateAsync(formData)
    } else if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, ...formData })
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
      </WinToolbar>
      <WinDataGrid
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page: 1, limit: 50, total: res?.meta.total ?? 0 }}
        onRowClick={setSelected}
        onRowDoubleClick={(r) => {
          setSelected(r)
          setFormMode('edit')
          setFormOpen(true)
        }}
      />
      <SupplierForm
        open={formOpen}
        mode={formMode}
        data={selected}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
      <WinMessageBox
        type="question"
        title="Xác nhận"
        message={`Xoá NCC "${selected?.name}"?`}
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
