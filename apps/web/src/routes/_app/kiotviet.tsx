import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { KiotVietPage } from '@/features/kiotviet/kiotviet-page'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  deducted: z.string().default(''),
  orderBy: z.string().default('orderDate'),
  sort: z.enum(['asc', 'desc']).default('desc'),
})

export type KiotVietSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/kiotviet')({
  component: KiotVietPage,
  validateSearch: (search) => searchSchema.parse(search),
})
