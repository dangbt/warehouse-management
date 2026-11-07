import { createFileRoute } from '@tanstack/react-router'
import { StockMatrixPage } from '@/features/reports/stock-matrix-page'
export const Route = createFileRoute('/_app/stock-matrix')({ component: StockMatrixPage })
