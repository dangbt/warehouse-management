import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PurchaseReturnsPage } from '@/features/purchase-returns/purchase-returns-page'
import { RequirePermission } from '@/components/require-permission'

const searchSchema = z.object({ id: z.string().optional() })

export const Route = createFileRoute('/_app/purchase-returns')({
  component: () => <RequirePermission permission="purchase_returns:read"><PurchaseReturnsPage /></RequirePermission>,
  validateSearch: (search) => searchSchema.parse(search),
})
