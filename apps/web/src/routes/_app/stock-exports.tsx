import { createFileRoute } from '@tanstack/react-router'
import { StockExportsPage } from '@/features/stock-exports/stock-exports-page'
export const Route = createFileRoute('/_app/stock-exports')({ component: StockExportsPage })
