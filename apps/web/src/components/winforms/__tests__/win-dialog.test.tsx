import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WinDialog } from '../win-dialog'

describe('WinDialog', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <WinDialog title="Test" open={false} onClose={() => {}}>
        Body
      </WinDialog>,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders title and body when open', () => {
    render(
      <WinDialog title="Thêm NL" open={true} onClose={() => {}}>
        Form content
      </WinDialog>,
    )
    expect(screen.getByText('Thêm NL')).toBeInTheDocument()
    expect(screen.getByText('Form content')).toBeInTheDocument()
  })

  it('calls onClose when X button clicked', () => {
    const fn = vi.fn()
    render(
      <WinDialog title="T" open={true} onClose={fn}>
        C
      </WinDialog>,
    )
    const closeBtn = screen.getAllByRole('button')[0]
    fireEvent.click(closeBtn)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay clicked', () => {
    const fn = vi.fn()
    const { container } = render(
      <WinDialog title="T" open={true} onClose={fn}>
        C
      </WinDialog>,
    )
    const overlay = container.querySelector('.fixed')!
    fireEvent.click(overlay)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('does not close when dialog body clicked', () => {
    const fn = vi.fn()
    render(
      <WinDialog title="T" open={true} onClose={fn}>
        Body
      </WinDialog>,
    )
    fireEvent.click(screen.getByText('Body'))
    expect(fn).not.toHaveBeenCalled()
  })

  it('renders footer buttons', () => {
    render(
      <WinDialog title="T" open={true} onClose={() => {}} footer={<button>OK</button>}>
        C
      </WinDialog>,
    )
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('applies custom width', () => {
    const { container } = render(
      <WinDialog title="T" open={true} onClose={() => {}} width={600}>
        C
      </WinDialog>,
    )
    const dialog = container.querySelector('[style]')
    expect(dialog).toHaveStyle({ width: '600px' })
  })
})
