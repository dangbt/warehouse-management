import { createFileRoute } from '@tanstack/react-router'
import { HouseholdBooksPage } from '@/features/tax/household-books-page'
import { RequirePermission } from '@/components/require-permission'

export const Route = createFileRoute('/_app/tax/books')({
  component: () => (
    <RequirePermission permission="tax:read">
      <HouseholdBooksPage />
    </RequirePermission>
  ),
})
