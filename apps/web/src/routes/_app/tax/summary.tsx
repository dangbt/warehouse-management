import { createFileRoute } from '@tanstack/react-router'
import { TaxSummaryPage } from '@/features/tax/tax-summary-page'
import { RequirePermission } from '@/components/require-permission'

export const Route = createFileRoute('/_app/tax/summary')({
  component: () => (
    <RequirePermission permission="tax:read">
      <TaxSummaryPage />
    </RequirePermission>
  ),
})
