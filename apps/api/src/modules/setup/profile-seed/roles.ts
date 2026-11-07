/** Vai trò + quyền mặc định cho khách mới (resource:action khớp @RequirePermissions). */
export interface RoleDef {
  code: string;
  name: string;
  permissions: [resource: string, action: string][];
}

const CRUD = ['create', 'read', 'update'] as const;
const crud = (resource: string): [string, string][] => CRUD.map((a) => [resource, a]);

const ADMIN_PERMISSIONS: [string, string][] = [
  ...crud('ingredients'),
  ['ingredients', 'delete'],
  ...crud('suppliers'),
  ['suppliers', 'delete'],
  ['import_orders', 'create'],
  ['import_orders', 'read'],
  ['import_orders', 'approve'],
  ['stock_exports', 'create'],
  ['stock_exports', 'read'],
  ['stock_transfers', 'read'],
  ['stock_transfers', 'create'],
  ['stock_transfers', 'approve'],
  ...crud('recipes'),
  ['users', 'create'],
  ['users', 'read'],
  ['users', 'update'],
  ['audit_logs', 'read'],
  ['kiotviet', 'read'],
  ['kiotviet', 'sync'],
  ['kiotviet', 'deduct'],
  ['stocktake', 'read'],
  ['stocktake', 'create'],
  ['stocktake', 'complete'],
  ['warehouses', 'read'],
  ['warehouses', 'create'],
  ['warehouses', 'update'],
  ['warehouses', 'delete'],
  ['purchase_returns', 'read'],
  ['purchase_returns', 'create'],
  ['supplier_payments', 'read'],
  ['supplier_payments', 'create'],
  ['processing', 'read'],
  ['processing', 'create'],
  ['processing', 'complete'],
  ['settings', 'update'],
  ['tax', 'read'],
  ['tax', 'manage'],
];

export const ROLE_DEFS: RoleDef[] = [
  { code: 'admin', name: 'Admin', permissions: ADMIN_PERMISSIONS },
  {
    code: 'warehouse_staff',
    name: 'Warehouse Staff',
    permissions: [
      ...crud('ingredients'),
      ['import_orders', 'create'],
      ['import_orders', 'read'],
      ['stock_exports', 'create'],
      ['stock_exports', 'read'],
      ['stock_transfers', 'create'],
      ['stock_transfers', 'read'],
      ['suppliers', 'read'],
      ['stocktake', 'read'],
      ['stocktake', 'create'],
    ],
  },
  {
    code: 'accountant',
    name: 'Accountant',
    permissions: [
      ['tax', 'read'],
      ['tax', 'manage'],
      ['import_orders', 'read'],
      ['supplier_payments', 'read'],
      ['supplier_payments', 'create'],
      ['suppliers', 'read'],
    ],
  },
];

/** Vai trò riêng của FNB (bếp). */
export const KITCHEN_ROLE: RoleDef = {
  code: 'kitchen_staff',
  name: 'Kitchen Staff',
  permissions: [['ingredients', 'read'], ...crud('recipes')],
};
