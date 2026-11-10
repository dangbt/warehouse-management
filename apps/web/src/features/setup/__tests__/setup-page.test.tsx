import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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

  it('POST /setup trả 403 → hiển thị "Mã cài đặt không đúng", không chuyển trang', async () => {
    queryData = { needsSetup: true, requiresToken: true }
    mockPost.mockRejectedValue(new Error('Mã cài đặt không đúng'))
    const user = userEvent.setup()
    render(<SetupPage />)

    // Điền form bắt buộc — dùng name attribute vì label không có htmlFor
    await user.type(screen.getByTestId('setup-token-input'), 'wrong-token')
    await user.type(document.querySelector('input[name="companyName"]')!, 'ACME')
    await user.type(document.querySelector('input[name="fullName"]')!, 'Admin')
    await user.type(document.querySelector('input[name="email"]')!, 'a@b.com')
    await user.type(document.querySelector('input[name="password"]')!, '123456')

    // Submit
    await user.click(screen.getByRole('button', { name: /Hoàn tất cài đặt/ }))

    await waitFor(() => {
      expect(screen.getByText('Mã cài đặt không đúng')).toBeInTheDocument()
    })

    // Không gọi navigate (không logout/redirect)
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
