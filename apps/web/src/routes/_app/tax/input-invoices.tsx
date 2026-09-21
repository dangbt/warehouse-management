import { createFileRoute } from '@tanstack/react-router'
import { InputInvoicesPage } from '@/features/tax/input-invoices-page'
import { RequirePermission } from '@/components/require-permission'

export const Route = createFileRoute('/_app/tax/input-invoices')({
  component: () => (
    <RequirePermission permission="tax:read">
      <InputInvoicesPage />
    </RequirePermission>
  ),
})
