import { createFileRoute } from '@tanstack/react-router'
import { ImportOrdersPage } from '@/features/import-orders/import-orders-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/import-orders')({ component: () => <RequirePermission permission="import_orders:read"><ImportOrdersPage /></RequirePermission> })
