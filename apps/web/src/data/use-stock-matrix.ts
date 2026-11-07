import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

export interface StockMatrixCell {
  qty: number
  minStock: number
  status: 'out' | 'low' | 'ok'
  ingredientIds: string[]
}
export interface StockMatrix {
  productId: string
  code: string
  name: string
  category: string | null
  rowAttribute: string
  colAttribute: string
  rows: string[]
  cols: string[]
  cells: (StockMatrixCell | null)[][]
  rowTotals: number[]
  colTotals: number[]
  grandTotal: number
}
export interface StockMatrixReport { products: StockMatrix[] }

export function useStockMatrix(params: { productId?: string; category?: string }, enabled = true) {
  return useQuery<StockMatrixReport>({
    queryKey: QUERY_KEYS.reports.stockMatrix(params),
    enabled,
    queryFn: () => {
      const q = new URLSearchParams()
      if (params.productId) q.set('product_id', params.productId)
      if (params.category) q.set('category', params.category)
      return api.get(`/reports/stock-matrix?${q}`)
    },
  })
}
