import { createFileRoute } from '@tanstack/react-router'
import { stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { PurchaseReturnsPage } from '@/features/purchase-returns/purchase-returns-page'
import { RequirePermission } from '@/components/require-permission'

const defaultSearch = {
  period: '',
  from: '',
  to: '',
}

const searchSchema = z.object({
  period: z.string().default(defaultSearch.period),
  from: z.string().default(defaultSearch.from),
  to: z.string().default(defaultSearch.to),
})

export type PurchaseReturnsSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/purchase-returns')({
  component: () => (
    <RequirePermission permission="purchase_returns:read">
      <PurchaseReturnsPage />
    </RequirePermission>
  ),
  validateSearch: (search) => searchSchema.parse(search),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
})
