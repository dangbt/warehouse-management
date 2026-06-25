import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../api'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock auth store
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: { getState: () => ({ token: 'test-token', logout: vi.fn() }) },
}))

describe('api service', () => {
  beforeEach(() => { mockFetch.mockReset() })

  it('GET adds auth header', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) })
    await api.get('/ingredients')
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/ingredients', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
    }))
  })

  it('POST sends body as JSON', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ id: '1' }) })
    await api.post('/ingredients', { name: 'Test' })
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/ingredients', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    }))
  })

  it('PUT sends body', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ id: '1' }) })
    await api.put('/ingredients/1', { name: 'Updated' })
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/ingredients/1', expect.objectContaining({ method: 'PUT' }))
  })

  it('DELETE calls with method DELETE', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    await api.delete('/ingredients/1')
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/ingredients/1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, json: () => Promise.resolve({ message: 'Bad request' }) })
    await expect(api.get('/fail')).rejects.toThrow('Bad request')
  })

  it('handles 401 by redirecting', async () => {
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) })
    await expect(api.get('/auth-fail')).rejects.toThrow('Unauthorized')
  })
})
