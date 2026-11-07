import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

export type StockDocType = 'IMPORT_ORDER' | 'STOCK_EXPORT' | 'PURCHASE_RETURN' | 'STOCKTAKE' | 'PROCESSING'

export interface StockCardLine {
  id: string
  voucherDate: string
  voucherNo: string | null
  docType: StockDocType | null
  docId: string | null
  type: string
  description: string
  inQty: number
  outQty: number
  balanceQty: number
  unitPrice: number
  inValue: number
  outValue: number
  balanceValue: number
}

export interface StockCardData {
  ingredient: { id: string; code: string; name: string; unit: string }
  from: string
  to: string
  opening: { qty: number; value: number }
  lines: StockCardLine[]
  totals: { inQty: number; outQty: number; inValue: number; outValue: number }
  closing: { qty: number; value: number }
}

export function useStockCard(params: { ingredientId: string; from: string; to: string; warehouseId?: string }, enabled = true) {
  return useQuery<StockCardData>({
    queryKey: QUERY_KEYS.reports.stockCard(params),
    enabled: enabled && !!params.ingredientId,
    queryFn: async () => {
      const q = new URLSearchParams({ ingredient_id: params.ingredientId, from: params.from, to: params.to })
      if (params.warehouseId) q.set('warehouse_id', params.warehouseId)
      const res: { data: StockCardData } | StockCardData = await api.get(`/reports/stock-card?${q}`)
      return 'lines' in res ? res : res.data
    },
  })
}
