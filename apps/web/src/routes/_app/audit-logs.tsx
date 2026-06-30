import { createFileRoute } from '@tanstack/react-router'
import { stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'
import { AuditLogsPage } from '@/features/audit-logs/audit-logs-page'

const defaultSearch = {
  page: 1,
  orderBy: 'createdAt',
  sort: 'desc',
}

const searchSchema = z.object({
  page: z.number().min(1).default(defaultSearch.page),
  orderBy: z.string().default(defaultSearch.orderBy),
  sort: z.enum(['asc', 'desc']).default(defaultSearch.sort as 'desc'),
})

export type AuditLogsSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/audit-logs')({
  component: AuditLogsPage,
  validateSearch: (search) => searchSchema.parse(search),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
})
