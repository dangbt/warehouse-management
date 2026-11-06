import { createFileRoute } from '@tanstack/react-router'
import { PurchaseOrdersPage } from '@/features/purchase-orders/purchase-orders-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/purchase-orders')({ component: () => <RequirePermission permission="purchase_ordersead"><PurchaseOrdersPage /></RequirePermission> })
