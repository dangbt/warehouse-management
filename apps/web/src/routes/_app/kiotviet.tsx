import { createFileRoute } from '@tanstack/react-router'
import { stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { KiotVietPage } from '@/features/kiotviet/kiotviet-page'

const defaultSearch = {
  page: 1,
  deducted: '',
  orderBy: 'orderDate',
  sort: 'desc',
}

const searchSchema = z.object({
  page: z.number().min(1).default(defaultSearch.page),
  deducted: z.string().default(defaultSearch.deducted),
  orderBy: z.string().default(defaultSearch.orderBy),
  sort: z.enum(['asc', 'desc']).default(defaultSearch.sort as 'desc'),
})

export type KiotVietSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/kiotviet')({
  component: KiotVietPage,
  validateSearch: (search) => searchSchema.parse(search),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
})
