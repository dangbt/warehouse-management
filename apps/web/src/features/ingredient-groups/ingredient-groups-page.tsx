import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid, WinDialog, WinGroupBox, WinInput } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { useIngredientGroups, useCreateIngredientGroup, useUpdateIngredientGroup, useIngredients } from '@/data'
import type { IngredientGroup } from '@/data'
import { formatNumber } from '@wms/shared'

interface GroupMember {
  id: string
  name: string
  unit: string
  groupId?: string | null
  baseFactor?: string | null
  sourceIngredientId?: string | null
  lossRatio?: string | null
  currentStock: string
}

function GroupMembersPanel({ group }: { group: IngredientGroup }) {
  const { data: res } = useIngredients({ limit: 1000 })
  const members = ((res?.data ?? []) as unknown as GroupMember[]).filter((i) => i.groupId === group.id)
  const totalBase = members.reduce((s, m) => s + Number(m.currentStock) * (m.baseFactor != null ? Number(m.baseFactor) : 1), 0)

  return (
    <div className="border-t border-win-grid-border max-h-[240px] overflow-auto">
      <WinGroupBox title={`📦 Chi tiết nhóm "${group.name}" — ${members.length} NL · tổng quy đổi ${formatNumber(totalBase)} ${group.baseUnit}`}>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-win-grid-header">
              <th className="text-left p-1">Nguyên liệu</th>
              <th className="text-center p-1">ĐVT</th>
              <th className="text-right p-1">Hệ số về nhóm</th>
              <th className="text-center p-1">Loại</th>
              <th className="text-right p-1">Hao hụt</th>
              <th className="text-right p-1">Tồn (quy đổi)</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const bf = m.baseFactor != null ? Number(m.baseFactor) : 1
              return (
                <tr key={m.id} className="border-b border-win-grid-border">
                  <td className="p-1">{m.name}</td>
                  <td className="p-1 text-center">{m.unit}</td>
                  <td className="p-1 text-right">{bf}</td>
                  <td className="p-1 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${m.sourceIngredientId ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                      {m.sourceIngredientId ? 'BTP' : 'Nguồn/gốc'}
                    </span>
                  </td>
                  <td className="p-1 text-right">{m.lossRatio != null ? `${(Number(m.lossRatio) * 100).toFixed(0)}%` : '-'}</td>
                  <td className="p-1 text-right">
                    {formatNumber(Number(m.currentStock) * bf)} {group.baseUnit}
                  </td>
                </tr>
              )
            })}
            {!members.length && (
              <tr>
                <td colSpan={6} className="p-2 text-center text-win-text-secondary">
                  Nhóm chưa có nguyên liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </WinGroupBox>
    </div>
  )
}

const columns: Column<IngredientGroup>[] = [
  { key: 'name', header: 'Tên nhóm', width: 200 },
  { key: 'baseUnit', header: 'Đơn vị gốc', width: 100, align: 'center' },
  {
    key: 'minStock',
    header: 'Tồn min (nhóm)',
    width: 120,
    align: 'right',
    render: (r) => (r.minStock != null ? formatNumber(r.minStock) : '-'),
  },
  { key: '_count', header: 'Số NL', width: 80, align: 'center', render: (r) => r._count?.ingredients ?? 0 },
]

interface GroupForm {
  name: string
  base_unit: string
  min_stock?: number | null
}

export function IngredientGroupsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [mode, setMode] = useState<'add' | 'edit'>('add')
  const [selected, setSelected] = useState<IngredientGroup | null>(null)

  const { data: groups, isLoading, refetch } = useIngredientGroups()
  const createMutation = useCreateIngredientGroup()
  const updateMutation = useUpdateIngredientGroup()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GroupForm>()

  useEffect(() => {
    if (formOpen) {
      reset(
        mode === 'edit' && selected
          ? {
              name: selected.name,
              base_unit: selected.baseUnit,
              min_stock: selected.minStock != null ? Number(selected.minStock) : undefined,
            }
          : { name: '', base_unit: 'kg', min_stock: undefined },
      )
    }
  }, [formOpen, mode, selected, reset])

  const onSubmit = async (data: GroupForm) => {
    const payload = {
      ...data,
      min_stock: data.min_stock === undefined || (data.min_stock as unknown as string) === '' ? null : Number(data.min_stock),
    }
    if (mode === 'add') await createMutation.mutateAsync(payload)
    else if (selected) await updateMutation.mutateAsync({ id: selected.id, ...payload })
    setFormOpen(false)
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button
          icon={<Plus size={14} />}
          label="Thêm"
          onClick={() => {
            setMode('add')
            setSelected(null)
            setFormOpen(true)
          }}
        />
        <WinToolbar.Button
          icon={<Pencil size={14} />}
          label="Sửa"
          disabled={!selected}
          onClick={() => {
            setMode('edit')
            setFormOpen(true)
          }}
        />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>

      <WinDataGrid
        columns={columns}
        data={groups ?? []}
        loading={isLoading}
        onRowClick={setSelected}
        onRowDoubleClick={(r) => {
          setSelected(r)
          setMode('edit')
          setFormOpen(true)
        }}
        storageKey="ingredient-groups"
      />

      {selected && <GroupMembersPanel group={selected} />}

      <WinDialog
        title={mode === 'add' ? '🆕 Thêm Nhóm Nguyên Liệu' : '✏️ Sửa Nhóm'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        width={400}
        footer={
          <>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="px-4 py-1 text-xs bg-win-active-title text-white border border-win-active-title rounded-sm min-w-[75px] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'OK'}
            </button>
            <button
              onClick={() => setFormOpen(false)}
              className="px-4 py-1 text-xs bg-win-button border border-win-button-border rounded-sm min-w-[75px] cursor-pointer hover:bg-win-button-hover"
            >
              Cancel
            </button>
          </>
        }
      >
        <WinGroupBox title="Thông tin nhóm">
          <div className="space-y-2.5">
            <WinInput label="Tên nhóm" {...register('name', { required: 'Bắt buộc' })} error={errors.name?.message} />
            <WinInput
              label="Đơn vị gốc (cộng tồn)"
              placeholder="vd kg"
              {...register('base_unit', { required: 'Bắt buộc' })}
              error={errors.base_unit?.message}
            />
            <WinInput label="Tồn min nhóm (tuỳ chọn)" type="number" step="0.001" {...register('min_stock')} />
          </div>
        </WinGroupBox>
      </WinDialog>
    </div>
  )
}
