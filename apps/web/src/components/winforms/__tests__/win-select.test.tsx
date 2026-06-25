import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WinSelect } from '../win-select'
import { createRef } from 'react'

const options = [
  { value: 'kg', label: 'Kilogam' },
  { value: 'l', label: 'Lít' },
]

describe('WinSelect', () => {
  it('renders label and select', () => {
    render(<WinSelect label="Đơn vị" options={options} />)
    expect(screen.getByText('Đơn vị:')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders default placeholder option', () => {
    render(<WinSelect label="Đơn vị" options={options} />)
    expect(screen.getByText('-- Chọn --')).toBeInTheDocument()
  })

  it('renders all options', () => {
    render(<WinSelect label="Đơn vị" options={options} />)
    expect(screen.getByText('Kilogam')).toBeInTheDocument()
    expect(screen.getByText('Lít')).toBeInTheDocument()
  })

  it('displays error message when error prop provided', () => {
    render(<WinSelect label="Đơn vị" options={options} error="Chọn đơn vị" />)
    expect(screen.getByText('Chọn đơn vị')).toBeInTheDocument()
  })

  it('applies error border class when error exists', () => {
    render(<WinSelect label="Đơn vị" options={options} error="Lỗi" />)
    expect(screen.getByRole('combobox')).toHaveClass('border-win-error')
  })

  it('applies normal border when no error', () => {
    render(<WinSelect label="Đơn vị" options={options} />)
    expect(screen.getByRole('combobox')).toHaveClass('border-win-input-border')
  })

  it('forwards ref to select element', () => {
    const ref = createRef<HTMLSelectElement>()
    render(<WinSelect label="Đơn vị" options={options} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLSelectElement)
  })

  it('handles onChange events', () => {
    const fn = vi.fn()
    render(<WinSelect label="Đơn vị" options={options} onChange={fn} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'kg' } })
    expect(fn).toHaveBeenCalled()
  })

  it('renders with empty options array', () => {
    render(<WinSelect label="Đơn vị" options={[]} />)
    const select = screen.getByRole('combobox')
    // Only the placeholder option
    expect(select.querySelectorAll('option')).toHaveLength(1)
  })
})
