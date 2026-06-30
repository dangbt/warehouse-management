import { createFileRoute } from '@tanstack/react-router'
import { stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { ProcessingPage } from '@/features/processing/processing-page'

const defaultSearch = {
  page: 1,
  status: '',
  orderBy: 'createdAt',
  sort: 'desc',
}

const searchSchema = z.object({
  page: z.number().min(1).default(defaultSearch.page),
  status: z.string().default(defaultSearch.status),
  orderBy: z.string().default(defaultSearch.orderBy),
  sort: z.enum(['asc', 'desc']).default(defaultSearch.sort as 'desc'),
})

export type ProcessingSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/processing')({
  component: ProcessingPage,
  validateSearch: (search) => searchSchema.parse(search),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
})
