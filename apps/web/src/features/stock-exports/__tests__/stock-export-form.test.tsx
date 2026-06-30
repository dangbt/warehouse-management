import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StockExportForm } from '../stock-export-form'

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Thịt bò', currentStock: '10', unit: 'kg' }] }),
  },
}))

describe('StockExportForm', () => {
  const defaultProps = { open: true, onClose: vi.fn(), onSave: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog with title when open', () => {
    render(<StockExportForm {...defaultProps} />)
    expect(screen.getByText('📤 Xuất Kho')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<StockExportForm open={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('loads ingredients on open and shows in dropdown', async () => {
    render(<StockExportForm {...defaultProps} />)
    // Click the ingredient search-select trigger to open dropdown
    const trigger = screen.getByTestId('select-Nguyên liệu')
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(screen.getByText('Thịt bò (tồn: 10 kg)')).toBeInTheDocument()
    })
  })

  it('validates required fields on submit', async () => {
    render(<StockExportForm {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('select-Nguyên liệu')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Xuất'))
    await waitFor(() => {
      // Reason is also required (native select)
      expect(screen.getByText('Chọn lý do')).toBeInTheDocument()
    })
  })

  it('validates quantity > 0', async () => {
    render(<StockExportForm {...defaultProps} />)
    const qtyInput = screen.getAllByRole('spinbutton')[0]
    fireEvent.change(qtyInput, { target: { value: '0' } })
    fireEvent.click(screen.getByText('Xuất'))
    await waitFor(() => {
      expect(screen.getByText('Phải > 0')).toBeInTheDocument()
    })
  })

  it('calls onSave and onClose on valid submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<StockExportForm open={true} onClose={onClose} onSave={onSave} />)

    // Open ingredient dropdown and select
    const trigger = screen.getByTestId('select-Nguyên liệu')
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(screen.getByText('Thịt bò (tồn: 10 kg)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Thịt bò (tồn: 10 kg)'))

    // Fill quantity
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '2' } })
    // Select reason (still native select)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DAMAGED' } })

    fireEvent.click(screen.getByText('Xuất'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows error message when onSave throws', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Không đủ tồn kho'))
    render(<StockExportForm open={true} onClose={vi.fn()} onSave={onSave} />)

    // Select ingredient
    fireEvent.click(screen.getByTestId('select-Nguyên liệu'))
    await waitFor(() => {
      expect(screen.getByText('Thịt bò (tồn: 10 kg)')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Thịt bò (tồn: 10 kg)'))

    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'EXPIRED' } })

    fireEvent.click(screen.getByText('Xuất'))
    await waitFor(() => {
      expect(screen.getByText(/Không đủ tồn kho/)).toBeInTheDocument()
    })
  })

  it('calls onClose when Huỷ clicked', () => {
    const onClose = vi.fn()
    render(<StockExportForm open={true} onClose={onClose} />)
    fireEvent.click(screen.getByText('Huỷ'))
    expect(onClose).toHaveBeenCalled()
  })
})
