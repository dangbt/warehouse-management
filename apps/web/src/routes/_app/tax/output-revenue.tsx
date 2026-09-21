import { createFileRoute } from '@tanstack/react-router'
import { OutputRevenuePage } from '@/features/tax/output-revenue-page'
import { RequirePermission } from '@/components/require-permission'

export const Route = createFileRoute('/_app/tax/output-revenue')({
  component: () => (
    <RequirePermission permission="tax:read">
      <OutputRevenuePage />
    </RequirePermission>
  ),
})
