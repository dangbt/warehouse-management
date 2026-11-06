import { createFileRoute } from '@tanstack/react-router'
import { PurchaseRequestsPage } from '@/features/purchase-requests/purchase-requests-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/purchase-requests')({ component: () => <RequirePermission permission="purchase_requestsead"><PurchaseRequestsPage /></RequirePermission> })
