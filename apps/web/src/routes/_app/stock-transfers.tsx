import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { StockTransfersPage } from '@/features/stock-transfers/stock-transfers-page'
import { RequirePermission } from '@/components/require-permission'

const defaultSearch = { page: 1, period: '', from: '', to: '', warehouseId: '' }

const searchSchema = z.object({
  page: z.number().min(1).default(defaultSearch.page),
  period: z.string().default(defaultSearch.period),
  from: z.string().default(defaultSearch.from),
  to: z.string().default(defaultSearch.to),
  warehouseId: z.string().default(defaultSearch.warehouseId),
  /** Mở đúng một chứng từ (từ Thẻ kho). */
  id: z.string().optional(),
})

export const Route = createFileRoute('/_app/stock-transfers')({
  component: () => (
    <RequirePermission permission="stock_transfers:read">
      <StockTransfersPage />
    </RequirePermission>
  ),
  validateSearch: (search) => searchSchema.parse(search),
  search: { middlewares: [stripSearchParams(defaultSearch)] },
})
