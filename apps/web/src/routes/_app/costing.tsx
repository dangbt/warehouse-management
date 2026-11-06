import { createFileRoute } from '@tanstack/react-router'
import { CostingPage } from '@/features/costing/costing-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/costing')({ component: () => <RequirePermission permission="tax:read"><CostingPage /></RequirePermission> })
