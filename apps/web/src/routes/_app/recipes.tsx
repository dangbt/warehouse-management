import { createFileRoute } from '@tanstack/react-router'
import { RecipesPage } from '@/features/recipes/RecipesPage'

export const Route = createFileRoute('/_app/recipes')({
  component: RecipesPage,
})
