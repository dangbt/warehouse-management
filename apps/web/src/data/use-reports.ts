import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

interface StockSummary { total: number; totalValue: number; lowStock: { name: string; unit: string; currentStock: string; minStock: string }[]; ingredients: unknown[] }
interface Transaction { id: string; ingredient: { name: string; unit: string }; type: string; quantity: string; note: string; createdBy: { fullName: string }; createdAt: string }

export function useStockSummary() {
  return useQuery<StockSummary>({ queryKey: QUERY_KEYS.reports.stockSummary, queryFn: () => api.get('/reports/stock-summary') })
}

export function useStockMovement() {
  return useQuery<Transaction[]>({ queryKey: QUERY_KEYS.reports.stockMovement, queryFn: () => api.get('/reports/stock-movement') })
}
