import { createFileRoute } from '@tanstack/react-router'
import { RecipesPage } from '@/features/recipes/recipes-page'
export const Route = createFileRoute('/_app/recipes')({ component: RecipesPage })
