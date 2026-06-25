import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../ui.store'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({ sidebarExpanded: true })
  })

  it('sidebar is expanded by default', () => {
    expect(useUIStore.getState().sidebarExpanded).toBe(true)
  })

  it('toggleSidebar collapses sidebar', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarExpanded).toBe(false)
  })

  it('toggleSidebar twice restores state', () => {
    useUIStore.getState().toggleSidebar()
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarExpanded).toBe(true)
  })
})
