import { createFileRoute } from '@tanstack/react-router'
import { TaxSettingsPage } from '@/features/tax/tax-settings-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/tax-settings')({ component: () => <RequirePermission permission="tax:read"><TaxSettingsPage /></RequirePermission> })
