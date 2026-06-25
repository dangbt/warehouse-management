import { createFileRoute } from '@tanstack/react-router'
import { IngredientsPage } from '@/features/ingredients/ingredients-page'
export const Route = createFileRoute('/_app/ingredients')({ component: IngredientsPage })
