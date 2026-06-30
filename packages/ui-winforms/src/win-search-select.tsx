import { forwardRef, useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Search } from 'lucide-react'

interface Props {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  onSearch: (query: string) => void
  loading?: boolean
  name?: string
  value?: string
  onChange?: (e: { target: { name?: string; value: string } }) => void
  onBlur?: () => void
  debounce?: number
  placeholder?: string
  className?: string
}

export const WinSearchSelect = forwardRef<HTMLInputElement, Props>(
  ({ label, error, options, onSearch, loading, name, value, onChange, onBlur, debounce = 300, placeholder, className }, ref) => {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [selectedLabel, setSelectedLabel] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    // Debounced search
    useEffect(() => {
      timerRef.current = setTimeout(() => onSearch(search), debounce)
      return () => clearTimeout(timerRef.current)
    }, [search, debounce, onSearch])

    // Update label when value changes externally
    useEffect(() => {
      if (!value) {
        setSelectedLabel('')
        return
      }
      const opt = options.find((o) => o.value === value)
      if (opt) setSelectedLabel(opt.label)
    }, [value, options])

    // Close on outside click
    useEffect(() => {
      if (!open) return
      const handler = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false)
          onBlur?.()
        }
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [open, onBlur])

    const handleSelect = useCallback(
      (opt: { value: string; label: string }) => {
        setSelectedLabel(opt.label)
        setOpen(false)
        onChange?.({ target: { name, value: opt.value } })
      },
      [name, onChange],
    )

    const testId = label || name || 'search-select'

    const selectContent = (
      <div className={`relative ${className ?? ''}`} ref={containerRef}>
        {/* Hidden input for form value */}
        <input type="hidden" ref={ref} name={name} value={value ?? ''} />

        {/* Trigger button */}
        <button
          type="button"
          data-testid={`select-${testId}`}
          onClick={() => {
            setOpen(!open)
            if (!open) setSearch('')
          }}
          className={`w-full border px-2 py-0.5 text-[11px] text-left bg-white flex items-center justify-between cursor-pointer ${error ? 'border-win-error' : 'border-win-input-border'} ${open ? 'border-win-input-focus' : ''}`}
        >
          <span className={`truncate ${selectedLabel ? '' : 'text-gray-400'}`}>{selectedLabel || placeholder || '-- Chọn --'}</span>
          <ChevronDown size={10} className="shrink-0 ml-1" />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 top-full left-0 min-w-full w-max mt-0.5 bg-white border border-win-grid-border shadow-md">
            {/* Search input inside dropdown */}
            <div className="flex items-center gap-1 px-1.5 py-1 border-b border-win-grid-border">
              <Search size={11} className="text-gray-400 shrink-0" />
              <input
                type="text"
                data-testid={`search-${testId}`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Gõ để tìm..."
                autoFocus
                className="flex-1 text-[11px] outline-none bg-transparent min-w-[120px]"
              />
            </div>

            {/* Options list */}
            <div className="max-h-[160px] overflow-y-auto">
              {loading && <div className="px-2 py-1.5 text-[11px] text-gray-400">Đang tìm...</div>}
              {!loading && options.length === 0 && (
                <div className="px-2 py-1.5 text-[11px] text-gray-400">Không tìm thấy</div>
              )}
              {options.map((opt) => (
                <div
                  key={opt.value}
                  data-testid={`option-${testId}`}
                  data-value={opt.value}
                  onClick={() => handleSelect(opt)}
                  className={`px-2 py-1 text-[11px] cursor-pointer hover:bg-win-menu-hover whitespace-nowrap ${opt.value === value ? 'bg-win-grid-selected font-medium' : ''}`}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-[10px] text-win-error mt-0.5">{error}</p>}
      </div>
    )

    // With label: use standard form layout
    if (label) {
      return (
        <div className="flex items-start gap-2">
          <label className="text-[11px] w-24 text-right shrink-0 pt-1">{label}:</label>
          <div className="flex-1">{selectContent}</div>
        </div>
      )
    }

    // Without label: render inline (for table cells)
    return selectContent
  },
)
