import { describe, it, expect } from 'vitest'
import { resolveApiBase } from '../api'

describe('resolveApiBase', () => {
  it('returns VITE_API_URL when provided', () => {
    expect(resolveApiBase('https://custom.example.com/api/v1', false)).toBe('https://custom.example.com/api/v1')
    expect(resolveApiBase('https://custom.example.com/api/v1', true)).toBe('https://custom.example.com/api/v1')
  })

  it('returns same-origin /api/v1 in production (isDev=false)', () => {
    expect(resolveApiBase(undefined, false)).toBe('/api/v1')
  })

  it('returns localhost URL in dev mode (isDev=true)', () => {
    expect(resolveApiBase(undefined, true)).toBe('http://localhost:3000/api/v1')
  })

  it('treats empty string VITE_API_URL as unset', () => {
    expect(resolveApiBase('', false)).toBe('/api/v1')
    expect(resolveApiBase('', true)).toBe('http://localhost:3000/api/v1')
  })
})
