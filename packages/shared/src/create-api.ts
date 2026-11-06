type TokenGetter = () => string | null
type OnUnauthorized = () => void

export function createApiClient(baseUrl: string, getToken: TokenGetter, onUnauthorized: OnUnauthorized) {
  async function request(path: string, options: RequestInit = {}) {
    const token = getToken()
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    if (res.status === 401 && !path.includes('/auth/login')) {
      onUnauthorized()
      throw new Error('Unauthorized')
    }
    const data = await res.json()
    if (!res.ok) {
      // Giữ nguyên message; đính kèm status + error code (vd PERIOD_LOCKED) để UI dịch theo code.
      throw Object.assign(new Error(data.message || 'API Error'), { status: res.status, code: typeof data.code === 'string' ? data.code : undefined, details: data })
    }
    return data
  }

  return {
    get: (path: string) => request(path),
    post: (path: string, body: unknown) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path: string, body: unknown) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path: string) => request(path, { method: 'DELETE' }),
  }
}
