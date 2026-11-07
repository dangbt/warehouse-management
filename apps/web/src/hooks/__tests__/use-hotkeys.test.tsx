import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useHotkeys, matchesCombo } from '../use-hotkeys'

function Harness({ onF2, onSave, enabled = true }: { onF2: () => void; onSave: () => void; enabled?: boolean }) {
  useHotkeys(
    [
      { keys: 'F2', handler: onF2 },
      { keys: ['Ctrl+S'], handler: onSave },
    ],
    enabled,
  )
  return <input data-testid="inp" />
}

describe('useHotkeys', () => {
  it('chạy handler khi bấm F2 ngoài input', () => {
    const f2 = vi.fn()
    render(<Harness onF2={f2} onSave={vi.fn()} />)
    fireEvent.keyDown(document.body, { key: 'F2' })
    expect(f2).toHaveBeenCalledTimes(1)
  })

  it('bỏ qua phím thường khi đang focus input, nhưng Ctrl+S vẫn chạy', () => {
    const f2 = vi.fn()
    const save = vi.fn()
    const { getByTestId } = render(<Harness onF2={f2} onSave={save} />)
    const inp = getByTestId('inp')
    inp.focus()
    fireEvent.keyDown(inp, { key: 'F2' })
    expect(f2).not.toHaveBeenCalled()
    fireEvent.keyDown(inp, { key: 's', ctrlKey: true })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('không chạy khi disabled', () => {
    const f2 = vi.fn()
    render(<Harness onF2={f2} onSave={vi.fn()} enabled={false} />)
    fireEvent.keyDown(document.body, { key: 'F2' })
    expect(f2).not.toHaveBeenCalled()
  })

  it('matchesCombo phân biệt Shift', () => {
    const e = new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, shiftKey: true })
    expect(matchesCombo(e, 'Ctrl+Shift+S')).toBe(true)
    expect(matchesCombo(e, 'Ctrl+S')).toBe(false)
  })
})
