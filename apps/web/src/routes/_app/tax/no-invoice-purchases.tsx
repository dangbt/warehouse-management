import { createFileRoute } from '@tanstack/react-router'
import { NoInvoicePurchasesPage } from '@/features/tax/no-invoice-purchases-page'
import { RequirePermission } from '@/components/require-permission'

export const Route = createFileRoute('/_app/tax/no-invoice-purchases')({
  component: () => (
    <RequirePermission permission="tax:read">
      <NoInvoicePurchasesPage />
    </RequirePermission>
  ),
})
