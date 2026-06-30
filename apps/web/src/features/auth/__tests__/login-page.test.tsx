import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginPage } from '../login-page'

// Mock router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

// Mock api
vi.mock('@/services/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

// Mock auth store
const mockLogin = vi.fn()
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ login: mockLogin }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    render(<LoginPage />)
    expect(screen.getByAltText('Mâm Vị')).toBeInTheDocument()
    expect(screen.getByText('Đăng Nhập')).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Đăng Nhập'))
    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập email')).toBeInTheDocument()
      expect(screen.getByText('Vui lòng nhập mật khẩu')).toBeInTheDocument()
    })
  })

  it('shows email format error', async () => {
    render(<LoginPage />)
    const emailInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(emailInput, { target: { value: 'notanemail' } })
    fireEvent.click(screen.getByText('Đăng Nhập'))
    await waitFor(() => {
      expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument()
    })
  })

  it('calls api.post on valid submit', async () => {
    const { api } = await import('@/services/api')
    vi.mocked(api.post).mockResolvedValue({
      access_token: 'tok',
      user: { id: '1', email: 'a@b.com', full_name: 'A', roles: ['admin'], permissions: [], is_active: true },
    })

    render(<LoginPage />)
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'admin@wms.vn' } })
    const pwInput = document.querySelector('input[type="password"]')!
    fireEvent.change(pwInput, { target: { value: '123456' } })
    fireEvent.click(screen.getByText('Đăng Nhập'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'admin@wms.vn', password: '123456' })
    })
  })

  it('shows error message on login failure', async () => {
    const { api } = await import('@/services/api')
    vi.mocked(api.post).mockRejectedValue(new Error('Email hoặc mật khẩu không đúng'))

    render(<LoginPage />)
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'admin@wms.vn' } })
    const pwInput = document.querySelector('input[type="password"]')!
    fireEvent.change(pwInput, { target: { value: 'wrong' } })
    fireEvent.click(screen.getByText('Đăng Nhập'))

    await waitFor(() => {
      expect(screen.getByText('Email hoặc mật khẩu không đúng')).toBeInTheDocument()
    })
  })
})
