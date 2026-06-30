import { createFileRoute } from '@tanstack/react-router'
import { stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { ImportOrdersPage } from '@/features/import-orders/import-orders-page'
import { RequirePermission } from '@/components/require-permission'

const defaultSearch = {
  page: 1,
  status: '',
  orderBy: 'createdAt',
  sort: 'desc',
}

const searchSchema = z.object({
  page: z.number().min(1).default(defaultSearch.page),
  status: z.string().default(defaultSearch.status),
  orderBy: z.string().default(defaultSearch.orderBy),
  sort: z.enum(['asc', 'desc']).default(defaultSearch.sort as 'desc'),
})

export type ImportOrdersSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/import-orders')({
  component: () => (
    <RequirePermission permission="import_orders:read">
      <ImportOrdersPage />
    </RequirePermission>
  ),
  validateSearch: (search) => searchSchema.parse(search),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
})
