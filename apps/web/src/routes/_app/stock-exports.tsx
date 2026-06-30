import { createFileRoute } from '@tanstack/react-router'
import { stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { StockExportsPage } from '@/features/stock-exports/stock-exports-page'
import { RequirePermission } from '@/components/require-permission'

const defaultSearch = {
  page: 1,
  orderBy: 'createdAt',
  sort: 'desc',
}

const searchSchema = z.object({
  page: z.number().min(1).default(defaultSearch.page),
  orderBy: z.string().default(defaultSearch.orderBy),
  sort: z.enum(['asc', 'desc']).default(defaultSearch.sort as 'desc'),
})

export type StockExportsSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/stock-exports')({
  component: () => (
    <RequirePermission permission="stock_exports:read">
      <StockExportsPage />
    </RequirePermission>
  ),
  validateSearch: (search) => searchSchema.parse(search),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
})
