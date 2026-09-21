import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { QUERY_KEYS } from './query-keys'
import { useToastStore } from '@/stores/toast.store'

export interface PurchaseReturn {
  id: string
  code: string
  supplier: { id: string; name: string }
  importOrderId?: string | null
  subtotal?: string
  vatAmount?: string
  totalAmount: string
  reason: string
  createdAt: string
  items: PurchaseReturnItem[]
}

export interface PurchaseReturnItem {
  id: string
  ingredient: { id: string; name: string; unit: string }
  quantity: number
  unitPrice: number
  vatRate?: string | null
  vatAmount?: string
}

interface ListResponse {
  data: PurchaseReturn[]
  meta: { page: number; limit: number; total: number }
}

/** Dòng nguyên liệu trong phiếu nhập gốc (để suy ra thuế suất mặc định khi trả). */
export interface ImportOrderOptionItem {
  ingredientId: string
  vatRate?: string | null
}

export interface ImportOrderOption {
  id: string
  code: string
  invoiceNo?: string | null
  invoiceSymbol?: string | null
  items: ImportOrderOptionItem[]
}

interface ImportOrderListResponse {
  data: {
    id: string
    code: string
    invoiceNo?: string | null
    invoiceSymbol?: string | null
    items?: { ingredientId: string; vatRate?: string | null }[]
  }[]
  meta: { page: number; limit: number; total: number }
}

export function usePurchaseReturns() {
  return useQuery<ListResponse>({
    queryKey: QUERY_KEYS.purchaseReturnsList(),
    queryFn: () => api.get('/purchase-returns?limit=50'),
  })
}

/**
 * Phiếu nhập đã duyệt + có hoá đơn của NCC đang chọn, để chọn làm phiếu gốc khi trả hàng.
 * Trả về mảng rỗng khi chưa chọn NCC.
 */
export function useCompletedImportOrders(supplierId: string) {
  return useQuery<ImportOrderOption[]>({
    queryKey: QUERY_KEYS.importOrdersList({ supplier_id: supplierId, status: 'COMPLETED', has_invoice: 'true' }),
    enabled: !!supplierId,
    queryFn: async () => {
      const res = (await api.get(
        `/import-orders?supplier_id=${supplierId}&status=COMPLETED&has_invoice=true&limit=100`,
      )) as ImportOrderListResponse
      return res.data.map((o) => ({
        id: o.id,
        code: o.code,
        invoiceNo: o.invoiceNo,
        invoiceSymbol: o.invoiceSymbol,
        items: (o.items ?? []).map((i) => ({ ingredientId: i.ingredientId, vatRate: i.vatRate })),
      }))
    },
  })
}

export function useCreatePurchaseReturn() {
  return useMutation({
    mutationFn: (data: {
      supplierId: string
      reason: string
      note?: string
      importOrderId?: string
      items: { ingredientId: string; quantity: number; unitPrice: number; vatRate?: string }[]
    }) =>
      api.post('/purchase-returns', {
        supplier_id: data.supplierId,
        reason: data.reason,
        note: data.note,
        import_order_id: data.importOrderId || undefined,
        items: data.items.map((i) => ({
          ingredient_id: i.ingredientId,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          vat_rate: i.vatRate || undefined,
        })),
      }),
    onSuccess: (newItem) => {
      queryClient.setQueriesData<ListResponse>({ queryKey: QUERY_KEYS.purchaseReturns }, (old) =>
        old ? { ...old, data: [newItem, ...old.data] } : old,
      )
      useToastStore.getState().success('Tạo phiếu trả hàng thành công')
    },
    onError: (e: Error) => {
      useToastStore.getState().error(e.message)
    },
  })
}
