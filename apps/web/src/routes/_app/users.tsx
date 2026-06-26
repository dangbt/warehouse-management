import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '@/features/users/users-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/users')({ component: () => <RequirePermission permission="users:read"><UsersPage /></RequirePermission> })
