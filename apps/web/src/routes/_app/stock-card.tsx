import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { StockCardPage } from '@/features/reports/stock-card-page'
import { RequirePermission } from '@/components/require-permission'

const searchSchema = z.object({
  ingredientId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  mode: z.enum(['qty', 'value']).default('qty'),
})

export type StockCardSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/stock-card')({
  component: () => (
    <RequirePermission permission="reports:read">
      <StockCardPage />
    </RequirePermission>
  ),
  validateSearch: (search) => searchSchema.parse(search),
})
