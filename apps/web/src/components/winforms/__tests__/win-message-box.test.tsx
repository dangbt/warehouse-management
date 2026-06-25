import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WinMessageBox } from '../win-message-box'

describe('WinMessageBox', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(<WinMessageBox type="info" title="T" message="M" open={false} onResult={() => {}} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows title and message', () => {
    render(<WinMessageBox type="info" title="Thông báo" message="Thao tác thành công" open={true} onResult={() => {}} />)
    expect(screen.getByText('Thông báo')).toBeInTheDocument()
    expect(screen.getByText('Thao tác thành công')).toBeInTheDocument()
  })

  it('renders OK button for default buttons', () => {
    render(<WinMessageBox type="info" title="T" message="M" open={true} onResult={() => {}} />)
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('renders Yes/No buttons', () => {
    render(<WinMessageBox type="question" title="T" message="M" open={true} buttons="yes_no" onResult={() => {}} />)
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
  })

  it('renders OK/Cancel buttons', () => {
    render(<WinMessageBox type="warning" title="T" message="M" open={true} buttons="ok_cancel" onResult={() => {}} />)
    expect(screen.getByText('OK')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls onResult with "ok" when OK clicked', () => {
    const fn = vi.fn()
    render(<WinMessageBox type="info" title="T" message="M" open={true} onResult={fn} />)
    fireEvent.click(screen.getByText('OK'))
    expect(fn).toHaveBeenCalledWith('ok')
  })

  it('calls onResult with "yes" when Yes clicked', () => {
    const fn = vi.fn()
    render(<WinMessageBox type="question" title="T" message="M" open={true} buttons="yes_no" onResult={fn} />)
    fireEvent.click(screen.getByText('Yes'))
    expect(fn).toHaveBeenCalledWith('yes')
  })

  it('calls onResult with "no" when No clicked', () => {
    const fn = vi.fn()
    render(<WinMessageBox type="question" title="T" message="M" open={true} buttons="yes_no" onResult={fn} />)
    fireEvent.click(screen.getByText('No'))
    expect(fn).toHaveBeenCalledWith('no')
  })

  it('calls onResult with "cancel" when Cancel clicked', () => {
    const fn = vi.fn()
    render(<WinMessageBox type="warning" title="T" message="M" open={true} buttons="ok_cancel" onResult={fn} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(fn).toHaveBeenCalledWith('cancel')
  })
})
