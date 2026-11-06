import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import type { Catalog } from './validate'

interface Page<T> {
  data: T[]
  meta: { total: number; limit: number }
}

/** Lấy hết các trang của một danh mục (API giới hạn limit mỗi trang). */
async function fetchAll<T>(path: string, limit: number): Promise<T[]> {
  const all: T[] = []
  for (let page = 1; page <= 200; page++) {
    const res = (await api.get(`${path}?limit=${limit}&page=${page}`)) as Page<T>
    all.push(...res.data)
    if (all.length >= res.meta.total || res.data.length === 0) break
  }
  return all
}

/** Nạp danh mục NCC + nguyên liệu khi mở dialog nhập Excel. */
export function useImportCatalog(open: boolean) {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    let alive = true
    setCatalog(null)
    setError('')
    Promise.all([fetchAll<Catalog['suppliers'][number]>('/suppliers', 50), fetchAll<Catalog['ingredients'][number]>('/ingredients', 50)])
      .then(([suppliers, ingredients]) => alive && setCatalog({ suppliers, ingredients }))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [open])
  return { catalog, error }
}
