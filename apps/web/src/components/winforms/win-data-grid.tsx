import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: number
  align?: 'left' | 'center' | 'right'
  render?: (row: T) => React.ReactNode
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
}

export function WinDataGrid<T extends { id?: string }>({
  columns, data, loading, pagination, onPageChange, onRowClick, onRowDoubleClick, getRowClass,
}: Props<T>) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1

  return (
    <div className="flex flex-col flex-1 overflow-hidden border border-win-grid-border">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-win-grid-header border-b border-win-grid-border">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-2 py-1.5 font-semibold border-r border-win-grid-border whitespace-nowrap select-none ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-win-text-secondary">Đang tải...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-win-text-secondary">Không có dữ liệu</td></tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  data-testid={`grid-row-${row.id ?? i}`}
                  className={`border-b border-[#EBEBEB] cursor-pointer
                    ${i % 2 === 1 ? 'bg-win-grid-row-alt' : 'bg-white'}
                    ${selectedId === row.id ? '!bg-win-grid-selected' : 'hover:bg-win-menu-hover'}
                    ${getRowClass?.(row) ?? ''}`}
                  onClick={() => { setSelectedId(row.id ?? null); onRowClick?.(row) }}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className={`px-2 py-1 border-r border-[#F0F0F0] ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="h-7 border-t border-win-grid-border bg-win-menu flex items-center justify-between px-2 text-[11px] shrink-0">
          <span>Hiển thị {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange?.(pagination.page - 1)} disabled={pagination.page <= 1} className="p-0.5 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span>Trang {pagination.page}/{totalPages}</span>
            <button onClick={() => onPageChange?.(pagination.page + 1)} disabled={pagination.page >= totalPages} className="p-0.5 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
