import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Columns3, ArrowUp, ArrowDown } from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type TableOptions,
} from '@tanstack/react-table'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: number
  align?: 'left' | 'center' | 'right'
  render?: (row: T) => React.ReactNode
  sortable?: boolean
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  pagination?: { page: number; limit: number; total: number }
  onPageChange?: (page: number) => void
  onRowClick?: (row: T) => void
  onRowDoubleClick?: (row: T) => void
  getRowClass?: (row: T) => string
  storageKey?: string
  tableOptions?: Partial<Omit<TableOptions<T>, 'data' | 'columns' | 'getCoreRowModel'>>
}

function getStorageKey(key: string) {
  try {
    const auth = JSON.parse(localStorage.getItem('wms-auth') || '{}')
    const userId = auth?.state?.user?.id || 'default'
    return `wms_cols_${key}_${userId}`
  } catch {
    return `wms_cols_${key}_default`
  }
}

export function WinDataGrid<T extends { id?: string }>({
  columns,
  data,
  loading,
  pagination,
  onPageChange,
  onRowClick,
  onRowDoubleClick,
  getRowClass,
  storageKey,
  tableOptions,
}: Props<T>) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showColMenu, setShowColMenu] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!storageKey) return
    try {
      const saved = localStorage.getItem(getStorageKey(storageKey))
      if (saved) {
        const hidden: string[] = JSON.parse(saved)
        setColumnVisibility(Object.fromEntries(hidden.map((k) => [k, false])))
      }
    } catch { /* ignore */ }
  }, [storageKey])

  const persistVisibility = (updated: VisibilityState) => {
    if (!storageKey) return
    const hidden = Object.entries(updated).filter(([, v]) => !v).map(([k]) => k)
    localStorage.setItem(getStorageKey(storageKey), JSON.stringify(hidden))
  }

  useEffect(() => {
    if (!showColMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowColMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColMenu])

  const columnDefs = useMemo<ColumnDef<T, unknown>[]>(
    () =>
      columns.map((col) => ({
        id: String(col.key),
        accessorFn: (row: T) => (row as Record<string, unknown>)[col.key as string],
        header: col.header,
        cell: col.render
          ? ({ row }) => col.render!(row.original)
          : ({ getValue }) => String(getValue() ?? ''),
        enableSorting: col.sortable !== false,
        size: col.width,
        meta: { align: col.align },
      })),
    [columns],
  )

  const table = useReactTable({
    data,
    columns: columnDefs,
    state: { sorting, columnVisibility, ...tableOptions?.state },
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater
      setColumnVisibility(next)
      persistVisibility(next)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...tableOptions,
    // Ensure state is merged, not overwritten
    ...(tableOptions?.state ? { state: { sorting, columnVisibility, ...tableOptions.state } } : {}),
  })

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1

  return (
    <div className="flex flex-col flex-1 overflow-hidden border border-win-grid-border">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-win-grid-header border-b border-win-grid-border">
              {table.getHeaderGroups()[0].headers.map((header) => {
                const meta = header.column.columnDef.meta as { align?: string } | undefined
                const alignCls = meta?.align === 'right' ? 'text-right' : meta?.align === 'center' ? 'text-center' : 'text-left'
                return (
                  <th
                    key={header.id}
                    className={`px-2 py-1.5 font-semibold border-r border-win-grid-border whitespace-nowrap select-none ${alignCls} ${header.column.getCanSort() ? 'cursor-pointer hover:bg-win-menu-hover' : ''}`}
                    style={header.column.columnDef.size ? { width: header.column.columnDef.size } : undefined}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ArrowUp size={10} />,
                        desc: <ArrowDown size={10} />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </span>
                  </th>
                )
              })}
              {storageKey && (
                <th className="w-6 px-0 border-r border-win-grid-border relative">
                  <button onClick={() => setShowColMenu(!showColMenu)} className="p-0.5 hover:bg-win-menu-hover" title="Chọn cột hiển thị">
                    <Columns3 size={12} />
                  </button>
                  {showColMenu && (
                    <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-white border border-win-grid-border shadow-md z-50 p-1 min-w-[140px]">
                      {table.getAllColumns().map((col) => (
                        <label key={col.id} className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] cursor-pointer hover:bg-win-menu-hover">
                          <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} className="w-3 h-3" />
                          {String(col.columnDef.header)}
                        </label>
                      ))}
                    </div>
                  )}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length + (storageKey ? 1 : 0)} className="text-center py-8 text-win-text-secondary">
                  Đang tải...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length + (storageKey ? 1 : 0)} className="text-center py-8 text-win-text-secondary">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => {
                const original = row.original
                return (
                  <tr
                    key={original.id ?? i}
                    data-testid={`grid-row-${original.id ?? i}`}
                    className={`border-b border-[#EBEBEB] cursor-pointer
                      ${i % 2 === 1 ? 'bg-win-grid-row-alt' : 'bg-white'}
                      ${selectedId === original.id ? '!bg-win-grid-selected' : 'hover:bg-win-menu-hover'}
                      ${getRowClass?.(original) ?? ''}`}
                    onClick={() => {
                      setSelectedId(original.id ?? null)
                      onRowClick?.(original)
                    }}
                    onDoubleClick={() => onRowDoubleClick?.(original)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as { align?: string } | undefined
                      return (
                        <td
                          key={cell.id}
                          className={`px-2 py-1 border-r border-[#F0F0F0] ${meta?.align === 'right' ? 'text-right' : meta?.align === 'center' ? 'text-center' : ''}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                    {storageKey && <td className="w-6 border-r border-[#F0F0F0]" />}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="h-7 border-t border-win-grid-border bg-win-menu flex items-center justify-between px-2 text-[11px] shrink-0">
          <span>
            Hiển thị {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange?.(pagination.page - 1)} disabled={pagination.page <= 1} className="p-0.5 disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <span>Trang {pagination.page}/{totalPages}</span>
            <button onClick={() => onPageChange?.(pagination.page + 1)} disabled={pagination.page >= totalPages} className="p-0.5 disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
