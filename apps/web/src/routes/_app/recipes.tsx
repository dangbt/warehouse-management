import { createFileRoute } from '@tanstack/react-router'
import { stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { RecipesPage } from '@/features/recipes/recipes-page'

const defaultSearch = {
  page: 1,
  orderBy: 'name',
  sort: 'asc',
}

const searchSchema = z.object({
  page: z.number().min(1).default(defaultSearch.page),
  orderBy: z.string().default(defaultSearch.orderBy),
  sort: z.enum(['asc', 'desc']).default(defaultSearch.sort as 'asc'),
})

export type RecipesSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/recipes')({
  component: RecipesPage,
  validateSearch: (search) => searchSchema.parse(search),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
})
