import { createFileRoute } from '@tanstack/react-router'
import { StocktakePage } from '@/features/stocktake/stocktake-page'
export const Route = createFileRoute('/_app/stocktake')({ component: StocktakePage })
