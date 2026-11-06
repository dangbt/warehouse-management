import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryClient } from './query-client'
import { useToastStore } from '@/stores/toast.store'

export interface AttributeValue {
  id: string
  attributeId: string
  value: string
  code: string
  sort: number
}

export interface ProductAttribute {
  id: string
  name: string
  code: string
  sort: number
  values: AttributeValue[]
}

export interface ProductRow {
  id: string
  code: string
  name: string
  category: string | null
  brand: string | null
  unit: string
  basePrice: string | null
  skuTemplate: string | null
  isActive: boolean
  _count?: { items: number }
  totalStock?: string | number
}

export interface ProductItem {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  variantKey: string | null
  unit: string
  currentStock: string
  costPerUnit: string
  salePrice: string | null
  isActive: boolean
  attributeValues?: { attributeId: string; attributeValueId: string }[]
}

export interface ProductDetail extends ProductRow {
  attributes: { attributeId: string; sort: number }[]
  items: ProductItem[]
}

export interface ProductInput {
  code?: string
  name?: string
  category?: string | null
  brand?: string | null
  unit?: string
  base_price?: number | null
  sku_template?: string | null
}

export interface GenerateInput {
  attributes: { attribute_id: string; value_ids: string[] }[]
  unit?: string
  cost_per_unit?: number
  sale_price?: number
}

const ATTR_KEY = ['product-attributes'] as const
const PRODUCTS_KEY = ['products'] as const

const onError = (e: Error) => useToastStore.getState().error(e.message)

export function useProductAttributes(enabled = true) {
  return useQuery<ProductAttribute[]>({ queryKey: ATTR_KEY, queryFn: () => api.get('/product-attributes'), enabled })
}

/** Mutation thuộc tính/giá trị: gọi hàm api rồi làm mới danh sách thuộc tính. */
export function useAttributeMutation<T>(fn: (v: T) => Promise<unknown>, okMessage?: string) {
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTR_KEY })
      if (okMessage) useToastStore.getState().success(okMessage)
    },
    onError,
  })
}

export const attributeApi = {
  create: (b: { name: string; code?: string; sort?: number }) => api.post('/product-attributes', b),
  update: ({ id, ...b }: { id: string; name?: string; code?: string; sort?: number }) => api.put(`/product-attributes/${id}`, b),
  remove: (id: string) => api.delete(`/product-attributes/${id}`),
  addValue: ({ id, ...b }: { id: string; value: string; code?: string; sort?: number }) => api.post(`/product-attributes/${id}/values`, b),
  updateValue: ({ id, ...b }: { id: string; value?: string; code?: string; sort?: number }) => api.put(`/product-attributes/values/${id}`, b),
  removeValue: (id: string) => api.delete(`/product-attributes/values/${id}`),
}

export function useProducts(params: { page?: number; search?: string; limit?: number }) {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.limit) q.set('limit', String(params.limit))
  if (params.search) q.set('search', params.search)
  return useQuery<{ data: ProductRow[]; meta: { page: number; limit: number; total: number } }>({
    queryKey: [...PRODUCTS_KEY, 'list', q.toString()],
    queryFn: () => api.get(`/products?${q}`),
  })
}

export function fetchProduct(id: string): Promise<ProductDetail> {
  return api.get(`/products/${id}`)
}

export function useProductDetail(id: string | null) {
  return useQuery<ProductDetail>({ queryKey: [...PRODUCTS_KEY, 'detail', id], queryFn: () => fetchProduct(id as string), enabled: !!id })
}

export const productApi = {
  create: (b: ProductInput & { code: string; name: string }): Promise<ProductRow> => api.post('/products', b),
  update: (id: string, b: ProductInput): Promise<ProductRow> => api.put(`/products/${id}`, b),
  generate: (id: string, b: GenerateInput) => api.post(`/products/${id}/variants/generate`, b),
  updateItem: (id: string, b: { name?: string; sku?: string | null; barcode?: string | null; sale_price?: number | null; cost_per_unit?: number }) =>
    api.put(`/ingredients/${id}`, b),
}

export function invalidateProducts() {
  queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
  queryClient.invalidateQueries({ queryKey: ['ingredients'] })
}
