import { createFileRoute } from '@tanstack/react-router'
import { InventoryPeriodPage } from '@/features/inventory-period/inventory-period-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/inventory-period')({ component: () => <RequirePermission permission="inventory_period:read"><InventoryPeriodPage /></RequirePermission> })
