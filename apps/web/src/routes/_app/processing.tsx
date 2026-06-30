import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ProcessingPage } from '@/features/processing/processing-page'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  status: z.string().default(''),
  orderBy: z.string().default('createdAt'),
  sort: z.enum(['asc', 'desc']).default('desc'),
})

export type ProcessingSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/processing')({
  component: ProcessingPage,
  validateSearch: (search) => searchSchema.parse(search),
})
