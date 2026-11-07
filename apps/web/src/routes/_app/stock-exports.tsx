import { createFileRoute } from '@tanstack/react-router'
import { stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { StockExportsPage } from '@/features/stock-exports/stock-exports-page'
import { RequirePermission } from '@/components/require-permission'

const defaultSearch = {
  page: 1,
  period: '',
  from: '',
  to: '',
  orderBy: 'voucherDate',
  sort: 'desc',
  warehouseId: '',
}

const searchSchema = z.object({
  page: z.number().min(1).default(defaultSearch.page),
  period: z.string().default(defaultSearch.period),
  from: z.string().default(defaultSearch.from),
  to: z.string().default(defaultSearch.to),
  orderBy: z.string().default(defaultSearch.orderBy),
  sort: z.enum(['asc', 'desc']).default(defaultSearch.sort as 'desc'),
  warehouseId: z.string().default(defaultSearch.warehouseId),
  /** Mở đúng một chứng từ (từ Thẻ kho). */
  id: z.string().optional(),
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
