import { createFileRoute } from '@tanstack/react-router'
import { VarianceReportPage } from '@/features/reports/variance-report-page'
export const Route = createFileRoute('/_app/consumption-variance')({ component: VarianceReportPage })
