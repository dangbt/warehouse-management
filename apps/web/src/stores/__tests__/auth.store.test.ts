import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../auth.store'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
  })

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })

  it('login sets user, token, isAuthenticated', () => {
    const user = { id: '1', email: 'a@b.com', full_name: 'Test', roles: ['admin'], permissions: ['*'], is_active: true }
    useAuthStore.getState().login(user, 'token123')
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(user)
    expect(state.token).toBe('token123')
  })

  it('logout clears state', () => {
    const user = { id: '1', email: 'a@b.com', full_name: 'Test', roles: ['admin'], permissions: ['*'], is_active: true }
    useAuthStore.getState().login(user, 'token123')
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })

  it('hasPermission returns true for admin', () => {
    const user = { id: '1', email: 'a@b.com', full_name: 'Test', roles: ['admin'], permissions: [], is_active: true }
    useAuthStore.getState().login(user, 'tok')
    expect(useAuthStore.getState().hasPermission('ingredients:create')).toBe(true)
  })

  it('hasPermission checks permissions array for non-admin', () => {
    const user = {
      id: '1',
      email: 'a@b.com',
      full_name: 'Test',
      roles: ['warehouse_staff'],
      permissions: ['ingredients:read', 'ingredients:create'],
      is_active: true,
    }
    useAuthStore.getState().login(user, 'tok')
    expect(useAuthStore.getState().hasPermission('ingredients:read')).toBe(true)
    expect(useAuthStore.getState().hasPermission('users:create')).toBe(false)
  })

  it('hasPermission returns false when not logged in', () => {
    expect(useAuthStore.getState().hasPermission('anything')).toBe(false)
  })
})
