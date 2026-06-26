import { createFileRoute } from '@tanstack/react-router'
import { IngredientGroupsPage } from '@/features/ingredient-groups/ingredient-groups-page'
export const Route = createFileRoute('/_app/ingredient-groups')({ component: IngredientGroupsPage })
