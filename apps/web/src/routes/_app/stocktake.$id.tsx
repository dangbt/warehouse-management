import { createFileRoute } from '@tanstack/react-router'
import { StocktakeDetailPage } from '@/features/stocktake/stocktake-detail-page'
export const Route = createFileRoute('/_app/stocktake/$id')({ component: StocktakeDetailPage })
