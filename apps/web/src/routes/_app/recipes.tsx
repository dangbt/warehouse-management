import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RecipesPage } from '@/features/recipes/recipes-page'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  orderBy: z.string().default('name'),
  sort: z.enum(['asc', 'desc']).default('asc'),
})

export type RecipesSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/recipes')({
  component: RecipesPage,
  validateSearch: (search) => searchSchema.parse(search),
})
