import { createFileRoute } from '@tanstack/react-router'
import { StockExportsPage } from '@/features/stock-exports/StockExportsPage'

export const Route = createFileRoute('/_app/stock-exports')({
  component: StockExportsPage,
})
