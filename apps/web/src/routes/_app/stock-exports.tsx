import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { StockExportsPage } from '@/features/stock-exports/stock-exports-page'
import { RequirePermission } from '@/components/require-permission'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  orderBy: z.string().default('createdAt'),
  sort: z.enum(['asc', 'desc']).default('desc'),
})

export type StockExportsSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/stock-exports')({
  component: () => (
    <RequirePermission permission="stock_exports:read">
      <StockExportsPage />
    </RequirePermission>
  ),
  validateSearch: (search) => searchSchema.parse(search),
})
