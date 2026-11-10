import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PoweredBy } from '../powered-by'

describe('PoweredBy', () => {
  it('renders the attribution string', () => {
    render(<PoweredBy />)
    expect(screen.getByTestId('powered-by')).toHaveTextContent(
      'Powered by Kho Việt — dangbt · v',
    )
  })

  it('links "Kho Việt" to the GitHub repo with target _blank', () => {
    render(<PoweredBy />)
    const link = screen.getByRole('link', { name: 'Kho Việt' })
    expect(link).toHaveAttribute('href', 'https://github.com/dangbt/warehouse-management')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('displays the app version', () => {
    render(<PoweredBy />)
    expect(screen.getByTestId('powered-by')).toHaveTextContent(`v${__APP_VERSION__}`)
  })
})
