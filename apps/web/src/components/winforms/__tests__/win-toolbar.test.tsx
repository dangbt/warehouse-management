import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WinToolbar } from '../win-toolbar'

describe('WinToolbar', () => {
  it('renders toolbar buttons with labels', () => {
    render(
      <WinToolbar>
        <WinToolbar.Button label="Thêm" />
        <WinToolbar.Button label="Sửa" />
      </WinToolbar>
    )
    expect(screen.getByText('Thêm')).toBeInTheDocument()
    expect(screen.getByText('Sửa')).toBeInTheDocument()
  })

  it('calls onClick when button clicked', () => {
    const fn = vi.fn()
    render(<WinToolbar><WinToolbar.Button label="Add" onClick={fn} /></WinToolbar>)
    fireEvent.click(screen.getByText('Add'))
    expect(fn).toHaveBeenCalledOnce()
  })

  it('disables button when disabled prop is true', () => {
    const fn = vi.fn()
    render(<WinToolbar><WinToolbar.Button label="Del" disabled onClick={fn} /></WinToolbar>)
    fireEvent.click(screen.getByText('Del'))
    expect(fn).not.toHaveBeenCalled()
  })

  it('renders separator', () => {
    const { container } = render(<WinToolbar><WinToolbar.Separator /></WinToolbar>)
    expect(container.querySelector('.w-px')).toBeInTheDocument()
  })
})
