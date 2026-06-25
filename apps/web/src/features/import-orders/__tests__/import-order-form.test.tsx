import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImportOrderForm } from '../import-order-form'

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn((path: string) => {
      if (path.includes('suppliers')) return Promise.resolve({ data: [{ id: 's1', name: 'NCC A' }] })
      if (path.includes('ingredients')) return Promise.resolve({ data: [{ id: 'i1', name: 'Thịt bò' }] })
      return Promise.resolve({ data: [] })
    }),
  },
}))

describe('ImportOrderForm', () => {
  const defaultProps = { open: true, onClose: vi.fn(), onSave: vi.fn() }

  beforeEach(() => { vi.clearAllMocks() })

  it('renders dialog with title when open', () => {
    render(<ImportOrderForm {...defaultProps} />)
    expect(screen.getByText('📄 Tạo Phiếu Nhập Kho')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<ImportOrderForm open={false} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('loads suppliers and ingredients', async () => {
    render(<ImportOrderForm {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('NCC A')).toBeInTheDocument()
      expect(screen.getByText('Thịt bò')).toBeInTheDocument()
    })
  })

  it('shows total as 0 initially', () => {
    render(<ImportOrderForm {...defaultProps} />)
    expect(screen.getByText(/Tổng:.*0/)).toBeInTheDocument()
  })

  it('validates supplier_id required', async () => {
    render(<ImportOrderForm {...defaultProps} />)
    fireEvent.click(screen.getByText('Lưu'))
    await waitFor(() => {
      expect(screen.getByText('Chọn NCC')).toBeInTheDocument()
    })
  })

  it('adds new item row when clicking Thêm dòng', async () => {
    render(<ImportOrderForm {...defaultProps} />)
    await waitFor(() => { expect(screen.getByText('NCC A')).toBeInTheDocument() })
    const rows = screen.getAllByRole('row')
    fireEvent.click(screen.getByText('Thêm dòng'))
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBe(rows.length + 1)
    })
  })

  it('calls onSave and closes on valid submit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<ImportOrderForm open={true} onClose={onClose} onSave={onSave} />)

    await waitFor(() => { expect(screen.getByText('NCC A')).toBeInTheDocument() })

    // Select supplier
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 's1' } })

    // Fill first item row
    fireEvent.change(selects[1], { target: { value: 'i1' } })
    const numbers = screen.getAllByRole('spinbutton')
    fireEvent.change(numbers[0], { target: { value: '5' } })
    fireEvent.change(numbers[1], { target: { value: '100000' } })

    fireEvent.click(screen.getByText('Lưu'))
    await waitFor(() => { expect(onSave).toHaveBeenCalled() })
    await waitFor(() => { expect(onClose).toHaveBeenCalled() })
  })

  it('shows error when onSave throws', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Lỗi server'))
    render(<ImportOrderForm open={true} onClose={vi.fn()} onSave={onSave} />)

    await waitFor(() => { expect(screen.getByText('NCC A')).toBeInTheDocument() })

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 's1' } })
    fireEvent.change(selects[1], { target: { value: 'i1' } })
    const numbers = screen.getAllByRole('spinbutton')
    fireEvent.change(numbers[0], { target: { value: '5' } })
    fireEvent.change(numbers[1], { target: { value: '100000' } })

    fireEvent.click(screen.getByText('Lưu'))
    await waitFor(() => {
      expect(screen.getByText(/Lỗi server/)).toBeInTheDocument()
    })
  })

  it('calls onClose when Huỷ clicked', () => {
    const onClose = vi.fn()
    render(<ImportOrderForm open={true} onClose={onClose} />)
    fireEvent.click(screen.getByText('Huỷ'))
    expect(onClose).toHaveBeenCalled()
  })
})
