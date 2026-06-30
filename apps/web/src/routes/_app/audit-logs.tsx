import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuditLogsPage } from '@/features/audit-logs/audit-logs-page'

const searchSchema = z.object({
  page: z.number().min(1).default(1),
  orderBy: z.string().default('createdAt'),
  sort: z.enum(['asc', 'desc']).default('desc'),
})

export type AuditLogsSearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_app/audit-logs')({
  component: AuditLogsPage,
  validateSearch: (search) => searchSchema.parse(search),
})
