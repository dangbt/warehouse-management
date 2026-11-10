import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/* ─── Mocks ─── */
const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('@/services/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

vi.mock('@/data/query-client', () => ({
  queryClient: {
    removeQueries: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

/* useQuery mock: trả kết quả dựa trên biến test */
let queryData: unknown = undefined
vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: { queryFn: () => unknown }) => {
    // Nếu test set queryData, trả về; nếu không thì gọi queryFn
    return { data: queryData, isLoading: false }
  },
}))

import { SetupPage } from '../setup-page'

describe('SetupPage — ô mã cài đặt', () => {
  beforeEach(() => {
    queryData = undefined
    mockGet.mockReset()
    mockPost.mockReset()
    mockNavigate.mockReset()
  })

  it('KHÔNG hiện ô mã cài đặt khi requiresToken = false', () => {
    queryData = { needsSetup: true, requiresToken: false }
    render(<SetupPage />)
    expect(screen.queryByTestId('setup-token-input')).not.toBeInTheDocument()
  })

  it('hiện ô mã cài đặt khi requiresToken = true', () => {
    queryData = { needsSetup: true, requiresToken: true }
    render(<SetupPage />)
    expect(screen.getByTestId('setup-token-input')).toBeInTheDocument()
  })

  it('ô mã cài đặt có type=password', () => {
    queryData = { needsSetup: true, requiresToken: true }
    render(<SetupPage />)
    const input = screen.getByTestId('setup-token-input')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('ô mã cài đặt là bắt buộc (required)', () => {
    queryData = { needsSetup: true, requiresToken: true }
    render(<SetupPage />)
    const input = screen.getByTestId('setup-token-input')
    expect(input).toBeRequired()
  })

  it('KHÔNG hiện ô khi response không có requiresToken', () => {
    queryData = { needsSetup: true }
    render(<SetupPage />)
    expect(screen.queryByTestId('setup-token-input')).not.toBeInTheDocument()
  })
})
