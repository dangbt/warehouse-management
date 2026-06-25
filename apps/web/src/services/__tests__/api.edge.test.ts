import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../api'

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockLogout = vi.fn()
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: { getState: () => ({ token: null, logout: mockLogout }) },
}))

describe('api service - edge cases', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockLogout.mockReset()
  })

  it('omits Authorization header when token is null', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    await api.get('/public')
    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.Authorization).toBeUndefined()
  })

  it('throws generic error when response has no message field', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    await expect(api.get('/fail')).rejects.toThrow('API Error')
  })

  it('calls logout on 401 response', async () => {
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) })
    await expect(api.get('/secure')).rejects.toThrow('Unauthorized')
    expect(mockLogout).toHaveBeenCalled()
  })

  it('redirects to /login on 401', async () => {
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) })
    await expect(api.get('/secure')).rejects.toThrow()
    expect(window.location.href).toBe('/login')
  })

  it('merges custom headers with defaults', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    await api.get('/custom')
    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('PUT stringifies body correctly', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    const body = { name: 'Updated', quantity: 10 }
    await api.put('/items/1', body)
    expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify(body))
  })

  it('DELETE does not send body', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })
    await api.delete('/items/1')
    expect(mockFetch.mock.calls[0][1].body).toBeUndefined()
  })
})
