import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WinGroupBox } from '../win-group-box'

describe('WinGroupBox', () => {
  it('renders title as legend', () => {
    render(<WinGroupBox title="Thông tin">Content</WinGroupBox>)
    expect(screen.getByText('Thông tin')).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(<WinGroupBox title="Test"><span>Child</span></WinGroupBox>)
    expect(screen.getByText('Child')).toBeInTheDocument()
  })

  it('renders as fieldset element', () => {
    const { container } = render(<WinGroupBox title="Box">X</WinGroupBox>)
    expect(container.querySelector('fieldset')).toBeInTheDocument()
  })
})
