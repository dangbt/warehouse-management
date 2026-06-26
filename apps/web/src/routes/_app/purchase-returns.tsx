import { createFileRoute } from '@tanstack/react-router'
import { PurchaseReturnsPage } from '@/features/purchase-returns/purchase-returns-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/purchase-returns')({ component: () => <RequirePermission permission="purchase_returns:read"><PurchaseReturnsPage /></RequirePermission> })
