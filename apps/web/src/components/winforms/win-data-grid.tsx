import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Columns3 } from 'lucide-react'

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
  storageKey?: string
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
}: Props<T>) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [showColMenu, setShowColMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!storageKey) return
    try {
      const saved = localStorage.getItem(getStorageKey(storageKey))
      if (saved) setHiddenCols(new Set(JSON.parse(saved)))
    } catch { /* ignore */ }
  }, [storageKey])

  const toggleCol = (key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      if (storageKey) localStorage.setItem(getStorageKey(storageKey), JSON.stringify([...next]))
      return next
    })
  }

  useEffect(() => {
    if (!showColMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowColMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColMenu])

  const visibleColumns = columns.filter((col) => !hiddenCols.has(String(col.key)))
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1

  return (
    <div className="flex flex-col flex-1 overflow-hidden border border-win-grid-border">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-win-grid-header border-b border-win-grid-border">
              {visibleColumns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-2 py-1.5 font-semibold border-r border-win-grid-border whitespace-nowrap select-none ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
              {storageKey && (
                <th className="w-6 px-0 border-r border-win-grid-border relative">
                  <button onClick={() => setShowColMenu(!showColMenu)} className="p-0.5 hover:bg-win-menu-hover" title="Chọn cột hiển thị">
                    <Columns3 size={12} />
                  </button>
                  {showColMenu && (
                    <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-white border border-win-grid-border shadow-md z-50 p-1 min-w-[140px]">
                      {columns.map((col) => (
                        <label key={String(col.key)} className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] cursor-pointer hover:bg-win-menu-hover">
                          <input type="checkbox" checked={!hiddenCols.has(String(col.key))} onChange={() => toggleCol(String(col.key))} className="w-3 h-3" />
                          {col.header}
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
                <td colSpan={visibleColumns.length + (storageKey ? 1 : 0)} className="text-center py-8 text-win-text-secondary">
                  Đang tải...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (storageKey ? 1 : 0)} className="text-center py-8 text-win-text-secondary">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  data-testid={`grid-row-${row.id ?? i}`}
                  className={`border-b border-[#EBEBEB] cursor-pointer
                    ${i % 2 === 1 ? 'bg-win-grid-row-alt' : 'bg-white'}
                    ${selectedId === row.id ? '!bg-win-grid-selected' : 'hover:bg-win-menu-hover'}
                    ${getRowClass?.(row) ?? ''}`}
                  onClick={() => {
                    setSelectedId(row.id ?? null)
                    onRowClick?.(row)
                  }}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                >
                  {visibleColumns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={`px-2 py-1 border-r border-[#F0F0F0] ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key as string] ?? '')}
                    </td>
                  ))}
                  {storageKey && <td className="w-6 border-r border-[#F0F0F0]" />}
                </tr>
              ))
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
