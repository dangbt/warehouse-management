import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Plus, RefreshCw } from 'lucide-react'
import { WinToolbar, WinDataGrid } from '@wms/ui-winforms'
import type { Column } from '@wms/ui-winforms'
import { formatCurrency, formatNumber } from '@wms/shared'
import { useProducts } from '@/data/use-products'
import type { ProductRow } from '@/data/use-products'
import { useTerm } from '@/data/use-features'
import { ProductForm } from './product-form'
import { VariantsPanel } from './variants-panel'

export function ProductsPage() {
  const t = useTerm()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<ProductRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const { data: res, isLoading, refetch } = useProducts({ page, search: search || undefined })

  const columns: Column<ProductRow>[] = [
    {
      key: 'expand',
      header: '',
      width: 32,
      align: 'center',
      render: (r) => (
        <button
          type="button"
          aria-label={`Xem biến thể ${r.code}`}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(expanded === r.id ? null : r.id)
          }}
          className="cursor-pointer"
        >
          {expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ),
    },
    { key: 'code', header: 'Mã', width: 120 },
    { key: 'name', header: t('item_name'), width: 240 },
    { key: 'category', header: t('item_group_short'), width: 120, render: (r) => r.category ?? '-' },
    { key: 'variants', header: 'Số biến thể', width: 90, align: 'center', render: (r) => r._count?.items ?? 0 },
    { key: 'totalStock', header: 'Tồn tổng', width: 90, align: 'right', render: (r) => formatNumber(r.totalStock ?? 0) },
    { key: 'basePrice', header: 'Giá bán gốc', width: 110, align: 'right', render: (r) => (r.basePrice != null ? formatCurrency(r.basePrice) : '-') },
  ]

  const open = (id: string | null) => {
    setEditId(id)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <WinToolbar.Button icon={<Plus size={16} />} label="Thêm" onClick={() => open(null)} />
        <WinToolbar.Button icon={<Pencil size={16} />} label="Sửa" disabled={!selected} onClick={() => selected && open(selected.id)} />
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={16} />} label="Refresh" onClick={() => refetch()} />
      </WinToolbar>
      <WinDataGrid
        searchable
        onSearch={(q) => {
          setSearch(q)
          setPage(1)
        }}
        columns={columns}
        data={res?.data ?? []}
        loading={isLoading}
        pagination={{ page, limit: 20, total: res?.meta.total ?? 0 }}
        onPageChange={setPage}
        onRowClick={setSelected}
        onRowDoubleClick={(r) => open(r.id)}
        storageKey="products"
      />
      {expanded && <VariantsPanel productId={expanded} />}
      <ProductForm
        open={formOpen}
        productId={editId}
        onClose={() => {
          setFormOpen(false)
          refetch()
        }}
      />
    </div>
  )
}
