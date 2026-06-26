import { createFileRoute } from '@tanstack/react-router'
import { SuppliersPage } from '@/features/suppliers/suppliers-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/suppliers')({ component: () => <RequirePermission permission="suppliers:read"><SuppliersPage /></RequirePermission> })
