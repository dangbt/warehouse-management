import { createFileRoute } from '@tanstack/react-router'
import { PurchaseReturnsPage } from '@/features/purchase-returns/purchase-returns-page'
export const Route = createFileRoute('/_app/purchase-returns')({ component: PurchaseReturnsPage })
