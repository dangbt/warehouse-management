import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

export interface StockGroupMember {
  id: string
  name: string
  unit: string
  currentStock: number
  baseFactor: number
  baseQty: number
  value: number
}
export interface StockGroup {
  id: string
  name: string
  baseUnit: string
  minStock: number | null
  items: StockGroupMember[]
  totalStock: number
  totalValue: number
  isLow: boolean
}
export interface LowStockProduct {
  productId: string
  code: string
  name: string
  unit: string
  lowCount: number
  outCount: number
  totalStock: number
  variants: { id: string; name: string; sku: string | null; currentStock: number; minStock: number; status: 'out' | 'low' | 'ok' }[]
}
interface StockSummary {
  total: number
  totalValue: number
  lowStock: { name: string; unit: string; currentStock: string; minStock: string; productId?: string | null }[]
  /** Chỉ có khi flag product_variants bật: tồn thấp gom theo SP. */
  lowStockProducts?: LowStockProduct[]
  groups: StockGroup[]
  ingredients: unknown[]
}
interface Transaction {
  id: string
  ingredient: { name: string; unit: string }
  type: string
  quantity: string
  note: string
  createdBy: { fullName: string }
  createdAt: string
}

export function useStockSummary() {
  return useQuery<StockSummary>({
    queryKey: QUERY_KEYS.reports.stockSummary,
    queryFn: () => api.get('/reports/stock-summary'),
  })
}

export function useStockMovement() {
  return useQuery<Transaction[]>({
    queryKey: QUERY_KEYS.reports.stockMovement,
    queryFn: () => api.get('/reports/stock-movement'),
  })
}
