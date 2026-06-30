import { createFileRoute } from '@tanstack/react-router'
import { stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { IngredientsPage } from '@/features/ingredients/ingredients-page'

const defaultSearch = {
  page: 1,
  search: '',
  category: '',
  orderBy: 'name',
  sort: 'asc',
}

const searchSchema = z.object({
  page: z.number().min(1).default(defaultSearch.page),
  search: z.string().default(defaultSearch.search),
  category: z.string().default(defaultSearch.category),
  orderBy: z.string().default(defaultSearch.orderBy),
  sort: z.enum(['asc', 'desc']).default(defaultSearch.sort as 'asc'),
})

export type IngredientsSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/ingredients')({
  component: IngredientsPage,
  validateSearch: (search) => searchSchema.parse(search),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
})
