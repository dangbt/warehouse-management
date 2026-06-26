import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WinStatusBar } from '../win-status-bar'

describe('WinStatusBar', () => {
  it('renders children sections', () => {
    render(
      <WinStatusBar>
        <WinStatusBar.Section>Ready</WinStatusBar.Section>
        <WinStatusBar.Section>User: Admin</WinStatusBar.Section>
      </WinStatusBar>,
    )
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('User: Admin')).toBeInTheDocument()
  })

  it('has status bar background color class', () => {
    const { container } = render(
      <WinStatusBar>
        <WinStatusBar.Section>OK</WinStatusBar.Section>
      </WinStatusBar>,
    )
    expect(container.firstChild).toHaveClass('bg-win-statusbar')
  })
})
