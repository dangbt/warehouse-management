import { createFileRoute } from '@tanstack/react-router'
import { StockExportsPage } from '@/features/stock-exports/stock-exports-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/stock-exports')({ component: () => <RequirePermission permission="stock_exports:read"><StockExportsPage /></RequirePermission> })
