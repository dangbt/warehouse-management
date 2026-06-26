export const QUERY_KEYS = {
  ingredients: ['ingredients'] as const,
  ingredientsList: (params?: Record<string, string>) => ['ingredients', 'list', params] as const,

  suppliers: ['suppliers'] as const,
  suppliersList: () => ['suppliers', 'list'] as const,

  importOrders: ['import-orders'] as const,
  importOrdersList: (params?: Record<string, string>) => ['import-orders', 'list', params] as const,

  stockExports: ['stock-exports'] as const,
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
  kiotvietOrdersList: (params?: Record<string, string | number | undefined>) =>
    ['kiotviet-orders', 'list', params] as const,

  ingredientUsage: ['ingredient-usage'] as const,
  ingredientUsageList: (params?: Record<string, string | undefined>) => ['ingredient-usage', 'list', params] as const,

  reports: {
    stockSummary: ['reports', 'stock-summary'] as const,
    stockMovement: ['reports', 'stock-movement'] as const,
  },
} as const
