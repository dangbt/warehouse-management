import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ImportOrdersPage } from '@/features/import-orders/import-orders-page'
import { RequirePermission } from '@/components/require-permission'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  status: z.string().default(''),
  orderBy: z.string().default('createdAt'),
  sort: z.enum(['asc', 'desc']).default('desc'),
})

export type ImportOrdersSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/import-orders')({
  component: () => (
    <RequirePermission permission="import_orders:read">
      <ImportOrdersPage />
    </RequirePermission>
  ),
  validateSearch: (search) => searchSchema.parse(search),
})
