import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

// Simple wrapper for rendering without router context
export function renderComponent(ui: ReactNode) {
  return render(<>{ui}</>)
}

export { render, screen, fireEvent, waitFor } from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
