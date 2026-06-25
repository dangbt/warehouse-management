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

  beforeEach(() => { vi.clearAllMocks() })

  it('renders dialog with title when open', () => {
    render(<StockExportForm {...defaultProps} />)
    expect(screen.getByText('📤 Xuất Kho')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<StockExportForm open={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('loads ingredients on open', async () => {
    render(<StockExportForm {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Thịt bò (tồn: 10 kg)')).toBeInTheDocument()
    })
  })

  it('validates required fields on submit', async () => {
    render(<StockExportForm {...defaultProps} />)
    fireEvent.click(screen.getByText('Xuất'))
    await waitFor(() => {
      expect(screen.getByText('Chọn nguyên liệu')).toBeInTheDocument()
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

    await waitFor(() => { expect(screen.getByText('Thịt bò (tồn: 10 kg)')).toBeInTheDocument() })

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: '1' } })
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '2' } })
    fireEvent.change(selects[1], { target: { value: 'DAMAGED' } })

    fireEvent.click(screen.getByText('Xuất'))
    await waitFor(() => { expect(onSave).toHaveBeenCalled() })
    await waitFor(() => { expect(onClose).toHaveBeenCalled() })
  })

  it('shows error message when onSave throws', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Không đủ tồn kho'))
    render(<StockExportForm open={true} onClose={vi.fn()} onSave={onSave} />)

    await waitFor(() => { expect(screen.getByText('Thịt bò (tồn: 10 kg)')).toBeInTheDocument() })

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: '1' } })
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '2' } })
    fireEvent.change(selects[1], { target: { value: 'EXPIRED' } })

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
