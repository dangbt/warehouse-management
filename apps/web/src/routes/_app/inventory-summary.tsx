import { createFileRoute } from '@tanstack/react-router'
import { InventorySummaryPage } from '@/features/reports/inventory-summary-page'
export const Route = createFileRoute('/_app/inventory-summary')({ component: InventorySummaryPage })
