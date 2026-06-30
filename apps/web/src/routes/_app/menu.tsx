import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { MenuPage } from '@/features/menu/menu-page'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  search: z.string().default(''),
  orderBy: z.string().default('name'),
  sort: z.enum(['asc', 'desc']).default('asc'),
})

export type MenuSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/menu')({
  component: MenuPage,
  validateSearch: (search) => searchSchema.parse(search),
})
