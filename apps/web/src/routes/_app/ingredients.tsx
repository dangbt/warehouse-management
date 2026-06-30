import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { IngredientsPage } from '@/features/ingredients/ingredients-page'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  search: z.string().default(''),
  category: z.string().default(''),
  orderBy: z.string().default('name'),
  sort: z.enum(['asc', 'desc']).default('asc'),
})

export type IngredientsSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/ingredients')({
  component: IngredientsPage,
  validateSearch: (search) => searchSchema.parse(search),
})
