import { createFileRoute } from '@tanstack/react-router'
import { stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { MenuPage } from '@/features/menu/menu-page'

const defaultSearch = {
  page: 1,
  search: '',
  orderBy: 'name',
  sort: 'asc',
}

const searchSchema = z.object({
  page: z.number().min(1).default(defaultSearch.page),
  search: z.string().default(defaultSearch.search),
  orderBy: z.string().default(defaultSearch.orderBy),
  sort: z.enum(['asc', 'desc']).default(defaultSearch.sort as 'asc'),
})

export type MenuSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/menu')({
  component: MenuPage,
  validateSearch: (search) => searchSchema.parse(search),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
})
