import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WinInput } from '../win-input'
import { createRef } from 'react'

describe('WinInput', () => {
  it('renders label and input', () => {
    render(<WinInput label="Tên" />)
    expect(screen.getByText('Tên:')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('displays error message when error prop provided', () => {
    render(<WinInput label="Tên" error="Bắt buộc" />)
    expect(screen.getByText('Bắt buộc')).toBeInTheDocument()
  })

  it('applies error border class when error exists', () => {
    render(<WinInput label="Tên" error="Lỗi" />)
    expect(screen.getByRole('textbox')).toHaveClass('border-win-error')
  })

  it('applies normal border when no error', () => {
    render(<WinInput label="Tên" />)
    expect(screen.getByRole('textbox')).toHaveClass('border-win-input-border')
  })

  it('forwards ref to input element', () => {
    const ref = createRef<HTMLInputElement>()
    render(<WinInput label="Test" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('passes through HTML input attributes', () => {
    render(<WinInput label="Số" type="number" placeholder="Nhập số" />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('placeholder', 'Nhập số')
  })

  it('handles onChange events', () => {
    const fn = vi.fn()
    render(<WinInput label="Tên" onChange={fn} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } })
    expect(fn).toHaveBeenCalled()
  })
})
