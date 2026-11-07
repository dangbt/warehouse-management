export const QUERY_KEYS = {
  warehouses: ['warehouses'] as const,
  warehousesList: () => ['warehouses', 'list'] as const,
  kiotvietWarehouseMap: ['kiotviet-warehouse-map'] as const,

  ingredients: ['ingredients'] as const,
  ingredientsList: (params?: Record<string, string>) => ['ingredients', 'list', params] as const,

  suppliers: ['suppliers'] as const,
  suppliersList: () => ['suppliers', 'list'] as const,

  importOrders: ['import-orders'] as const,
  importOrdersList: (params?: Record<string, string>) => ['import-orders', 'list', params] as const,

  stockExports: ['stock-exports'] as const,
  stockTransfers: ['stock-transfers'] as const,
  stockExportsList: () => ['stock-exports', 'list'] as const,

  recipes: ['recipes'] as const,
  recipesList: () => ['recipes', 'list'] as const,

  users: ['users'] as const,
  usersList: () => ['users', 'list'] as const,

  roles: ['roles'] as const,
  rolesList: () => ['roles', 'list'] as const,

  departments: ['departments'] as const,
  menuItems: ['menu-items'] as const,

  auditLogs: ['audit-logs'] as const,
  auditLogsList: (params?: Record<string, string>) => ['audit-logs', 'list', params] as const,

  kiotvietOrders: ['kiotviet-orders'] as const,
  kiotvietOrdersList: (params?: Record<string, string | number | undefined>) => ['kiotviet-orders', 'list', params] as const,

  ingredientUsage: ['ingredient-usage'] as const,
  ingredientUsageList: (params?: Record<string, string | undefined>) => ['ingredient-usage', 'list', params] as const,

  batches: ['batches'] as const,
  batchesList: (ingredientId: string) => ['batches', 'list', ingredientId] as const,
  expiringBatches: (days: number) => ['batches', 'expiring', days] as const,

  stocktake: ['stocktake'] as const,
  stocktakeList: () => ['stocktake', 'list'] as const,
  stocktakeDetail: (id: string) => ['stocktake', 'detail', id] as const,

  purchaseRequests: ['purchase-requests'] as const,
  purchaseRequestsList: () => ['purchase-requests', 'list'] as const,
  purchaseOrders: ['purchase-orders'] as const,
  purchaseOrdersList: () => ['purchase-orders', 'list'] as const,

  purchaseReturns: ['purchase-returns'] as const,
  purchaseReturnsList: (params?: Record<string, string>) => ['purchase-returns', 'list', params] as const,

  supplierPayments: ['supplier-payments'] as const,
  supplierPaymentsList: (supplierId: string) => ['supplier-payments', 'list', supplierId] as const,

  ingredientGroups: ['ingredient-groups'] as const,
  ingredientGroupsList: () => ['ingredient-groups', 'list'] as const,

  processing: ['processing'] as const,
  processingList: (params?: Record<string, string>) => ['processing', 'list', params] as const,

  taxSettings: ['tax-settings'] as const,

  tax: {
    inputInvoices: (period?: string) => ['tax', 'input-invoices', period] as const,
    noInvoicePurchases: (period?: string) => ['tax', 'no-invoice-purchases', period] as const,
    outputRevenue: (period?: string) => ['tax', 'output-revenue', period] as const,
    summary: (period?: string, carriedForward?: number) => ['tax', 'summary', period, carriedForward] as const,
    revenueBook: (period?: string) => ['tax', 'books', 'revenue', period] as const,
    materialsBook: (period?: string, ingredientId?: string) => ['tax', 'books', 'materials', period, ingredientId] as const,
  },

  reports: {
    stockSummary: ['reports', 'stock-summary'] as const,
    stockMovement: ['reports', 'stock-movement'] as const,
    consumptionVariance: (params?: Record<string, string | undefined>) => ['reports', 'consumption-variance', params] as const,
    stockCard: (params?: { ingredientId: string; from: string; to: string }) => ['reports', 'stock-card', params] as const,
    inventorySummary: (params?: object) => ['reports', 'inventory-summary', params] as const,
    stockMatrix: (params?: object) => ['reports', 'stock-matrix', params] as const,
    expiring: (days: number) => ['reports', 'expiring', days] as const,
  },
} as const
