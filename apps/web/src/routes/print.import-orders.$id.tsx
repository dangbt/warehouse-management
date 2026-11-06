import { createFileRoute, redirect } from '@tanstack/react-router'
import { ImportOrderPrintPage } from '@/features/import-orders/print/import-order-print-page'
import { useAuthStore } from '@/stores/auth.store'

// Route nằm ngoài _app nên không có menu/sidebar/toolbar của app.
export const Route = createFileRoute('/print/import-orders/$id')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' })
  },
  component: PrintRoute,
})

function PrintRoute() {
  const { id } = Route.useParams()
  return <ImportOrderPrintPage id={id} />
}
