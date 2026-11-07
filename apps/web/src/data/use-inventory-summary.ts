import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from './query-keys'

export interface QtyValue { qty: number; value: number }
export interface InventoryTotals { opening: QtyValue; inbound: QtyValue; outbound: QtyValue; closing: QtyValue }
export interface InventorySummaryRow extends InventoryTotals {
  ingredientId: string
  code: string
  name: string
  unit: string
  /** Gộp theo SP (WMS-22): dòng SP có variants = các biến thể. */
  productId?: string
  variantLabel?: string
  variants?: InventorySummaryRow[]
}
export interface InventorySummaryGroup {
  groupId: string | null
  groupName: string
  rows: InventorySummaryRow[]
  total: InventoryTotals
}
export interface InventorySummaryReport {
  from: string
  to: string
  groups: InventorySummaryGroup[]
  grandTotal: InventoryTotals
  valueNote: string
}

export interface InventorySummaryParams {
  from: string
  to: string
  groupId?: string
  groupBy?: 'product'
  category?: string
  attributeValueId?: string
}

export function useInventorySummary(params: InventorySummaryParams) {
  return useQuery<InventorySummaryReport>({
    queryKey: QUERY_KEYS.reports.inventorySummary(params),
    queryFn: async () => {
      const q = new URLSearchParams({ from: params.from, to: params.to })
      if (params.groupId) q.set('group_id', params.groupId)
      if (params.groupBy) q.set('group_by', params.groupBy)
      if (params.category) q.set('category', params.category)
      if (params.attributeValueId) q.set('attribute_value_id', params.attributeValueId)
      const res: { data: InventorySummaryReport } | InventorySummaryReport = await api.get(`/reports/inventory-summary?${q}`)
      return 'groups' in res ? res : res.data
    },
  })
}
