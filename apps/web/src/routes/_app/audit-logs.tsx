import { createFileRoute } from '@tanstack/react-router'
import { AuditLogsPage } from '@/features/audit-logs/audit-logs-page'
export const Route = createFileRoute('/_app/audit-logs')({ component: AuditLogsPage })
