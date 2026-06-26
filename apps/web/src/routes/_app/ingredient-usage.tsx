import { createFileRoute } from '@tanstack/react-router'
import { IngredientUsagePage } from '@/features/reports/ingredient-usage-page'
export const Route = createFileRoute('/_app/ingredient-usage')({ component: IngredientUsagePage })
