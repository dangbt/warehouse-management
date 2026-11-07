import { createFileRoute } from '@tanstack/react-router'
import { WarehousesPage } from '@/features/warehouses/warehouses-page'
import { RequirePermission } from '@/components/require-permission'

export const Route = createFileRoute('/_app/warehouses')({
  component: () => (
    <RequirePermission permission="warehouses:read">
      <WarehousesPage />
    </RequirePermission>
  ),
})
