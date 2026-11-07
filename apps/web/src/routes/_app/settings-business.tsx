import { createFileRoute } from '@tanstack/react-router'
import { BusinessProfilePage } from '@/features/settings/business-profile-page'
import { RequirePermission } from '@/components/require-permission'
export const Route = createFileRoute('/_app/settings-business')({
  component: () => (
    <RequirePermission permission="settings:update">
      <BusinessProfilePage />
    </RequirePermission>
  ),
})
