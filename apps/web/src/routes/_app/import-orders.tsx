import { createFileRoute } from '@tanstack/react-router'
import { ImportOrdersPage } from '@/features/import-orders/import-orders-page'
export const Route = createFileRoute('/_app/import-orders')({ component: ImportOrdersPage })
