import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WinTreeView } from '../win-tree-view'
import type { TreeNode } from '@/types'

const nodes: TreeNode[] = [
  { id: 'warehouse', label: 'Kho', icon: '📦', children: [
    { id: 'ingredients', label: 'Nguyên liệu', route: '/ingredients' },
    { id: 'imports', label: 'Nhập kho', route: '/import-orders' },
  ]},
  { id: 'reports', label: 'Báo cáo', icon: '📊', route: '/reports' },
]

describe('WinTreeView', () => {
  it('renders top-level nodes', () => {
    render(<WinTreeView nodes={nodes} onSelect={() => {}} />)
    expect(screen.getByText('Kho')).toBeInTheDocument()
    expect(screen.getByText('Báo cáo')).toBeInTheDocument()
  })

  it('renders child nodes (expanded by default)', () => {
    render(<WinTreeView nodes={nodes} onSelect={() => {}} />)
    expect(screen.getByText('Nguyên liệu')).toBeInTheDocument()
    expect(screen.getByText('Nhập kho')).toBeInTheDocument()
  })

  it('calls onSelect with node when leaf clicked', () => {
    const fn = vi.fn()
    render(<WinTreeView nodes={nodes} onSelect={fn} />)
    fireEvent.click(screen.getByText('Nguyên liệu'))
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ id: 'ingredients', route: '/ingredients' }))
  })

  it('collapses children when parent clicked', () => {
    render(<WinTreeView nodes={nodes} onSelect={() => {}} />)
    fireEvent.click(screen.getByText('Kho'))
    expect(screen.queryByText('Nguyên liệu')).not.toBeInTheDocument()
  })

  it('expands children when collapsed parent clicked again', () => {
    render(<WinTreeView nodes={nodes} onSelect={() => {}} />)
    fireEvent.click(screen.getByText('Kho'))
    fireEvent.click(screen.getByText('Kho'))
    expect(screen.getByText('Nguyên liệu')).toBeInTheDocument()
  })

  it('highlights active node', () => {
    render(<WinTreeView nodes={nodes} activeId="ingredients" onSelect={() => {}} />)
    const activeNode = screen.getByText('Nguyên liệu').closest('div')!
    expect(activeNode.className).toContain('bg-win-grid-selected')
  })

  it('renders icons for nodes', () => {
    render(<WinTreeView nodes={nodes} onSelect={() => {}} />)
    expect(screen.getByText('📦')).toBeInTheDocument()
    expect(screen.getByText('📊')).toBeInTheDocument()
  })

  it('calls onSelect for node with route', () => {
    const fn = vi.fn()
    render(<WinTreeView nodes={nodes} onSelect={fn} />)
    fireEvent.click(screen.getByText('Báo cáo'))
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ route: '/reports' }))
  })
})
