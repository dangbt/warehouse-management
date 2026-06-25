export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  department?: Department
  roles: string[]
  permissions: string[]
  is_active: boolean
}

export interface Department {
  id: string
  name: string
  code: string
}

export interface Ingredient {
  id: string
  name: string
  unit: string
  min_stock: number
  current_stock: number
  cost_per_unit: number
  category: string
  created_at: string
}

export interface Supplier {
  id: string
  name: string
  phone: string
  address: string
  note?: string
}

export interface ImportOrder {
  id: string
  code: string
  supplier: Supplier
  total_amount: number
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
  note?: string
  created_by: string
  approved_by?: string
  created_at: string
  items: ImportOrderItem[]
}

export interface ImportOrderItem {
  id: string
  ingredient_id: string
  ingredient_name?: string
  quantity: number
  unit_price: number
  total_price: number
  expiry_date?: string
}

export interface Recipe {
  id: string
  menu_item_id: string
  name: string
  serving_size: number
  ingredients: RecipeIngredient[]
}

export interface RecipeIngredient {
  id: string
  ingredient_id: string
  ingredient_name?: string
  quantity: number
  unit: string
}

export interface AuditLog {
  id: string
  user: { id: string; full_name: string }
  action: string
  resource: string
  resource_id: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address: string
  created_at: string
}

export interface TreeNode {
  id: string
  label: string
  icon?: string
  children?: TreeNode[]
  route?: string
  permission?: string
}
