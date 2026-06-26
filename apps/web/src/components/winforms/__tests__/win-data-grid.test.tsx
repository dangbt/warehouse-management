import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WinDataGrid } from '../win-data-grid'
import type { Column } from '../win-data-grid'

interface Item {
  id: string
  name: string
  qty: number
}

const columns: Column<Item>[] = [
  { key: 'name', header: 'Tên' },
  { key: 'qty', header: 'Số lượng' },
]

const data: Item[] = [
  { id: '1', name: 'Thịt bò', qty: 10 },
  { id: '2', name: 'Rau muống', qty: 3 },
  { id: '3', name: 'Hành', qty: 5 },
]

describe('WinDataGrid', () => {
  it('renders column headers', () => {
    render(<WinDataGrid columns={columns} data={data} />)
    expect(screen.getByText('Tên')).toBeInTheDocument()
    expect(screen.getByText('Số lượng')).toBeInTheDocument()
  })

  it('renders all data rows', () => {
    render(<WinDataGrid columns={columns} data={data} />)
    expect(screen.getByText('Thịt bò')).toBeInTheDocument()
    expect(screen.getByText('Rau muống')).toBeInTheDocument()
    expect(screen.getByText('Hành')).toBeInTheDocument()
  })

  it('shows empty message when no data', () => {
    render(<WinDataGrid columns={columns} data={[]} />)
    expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<WinDataGrid columns={columns} data={[]} loading />)
    expect(screen.getByText('Đang tải...')).toBeInTheDocument()
  })

  it('calls onRowDoubleClick when row double-clicked', () => {
    const fn = vi.fn()
    render(<WinDataGrid columns={columns} data={data} onRowDoubleClick={fn} />)
    fireEvent.doubleClick(screen.getByText('Thịt bò'))
    expect(fn).toHaveBeenCalledWith(data[0])
  })

  it('highlights selected row on click', () => {
    render(<WinDataGrid columns={columns} data={data} />)
    const row = screen.getByText('Rau muống').closest('tr')!
    fireEvent.click(row)
    expect(row.className).toContain('bg-win-grid-selected')
  })

  it('renders custom column render function', () => {
    const cols: Column<Item>[] = [
      { key: 'name', header: 'Tên' },
      { key: 'qty', header: 'SL', render: (r) => <span data-testid="custom">{r.qty * 2}</span> },
    ]
    render(<WinDataGrid columns={cols} data={[data[0]]} />)
    expect(screen.getByTestId('custom')).toHaveTextContent('20')
  })

  it('renders pagination info', () => {
    render(<WinDataGrid columns={columns} data={data} pagination={{ page: 1, limit: 20, total: 45 }} />)
    expect(screen.getByText('Hiển thị 1-20 / 45')).toBeInTheDocument()
    expect(screen.getByText('Trang 1/3')).toBeInTheDocument()
  })

  it('calls onPageChange when next page clicked', () => {
    const fn = vi.fn()
    render(
      <WinDataGrid columns={columns} data={data} pagination={{ page: 1, limit: 20, total: 45 }} onPageChange={fn} />,
    )
    const buttons = screen.getAllByRole('button')
    const nextBtn = buttons[buttons.length - 1]
    fireEvent.click(nextBtn)
    expect(fn).toHaveBeenCalledWith(2)
  })

  it('disables prev button on first page', () => {
    render(<WinDataGrid columns={columns} data={data} pagination={{ page: 1, limit: 20, total: 45 }} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()
  })

  it('applies getRowClass to rows', () => {
    render(<WinDataGrid columns={columns} data={data} getRowClass={(r) => (r.qty < 5 ? 'low-stock' : '')} />)
    const row = screen.getByText('Rau muống').closest('tr')!
    expect(row.className).toContain('low-stock')
  })
})
