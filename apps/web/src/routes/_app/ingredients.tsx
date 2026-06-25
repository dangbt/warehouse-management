import { createFileRoute } from '@tanstack/react-router'
import { IngredientsPage } from '@/features/ingredients/IngredientsPage'

export const Route = createFileRoute('/_app/ingredients')({
  component: IngredientsPage,
})
