import { createFileRoute, redirect } from '@tanstack/react-router'
import { StockTransferPrintPage } from '@/features/stock-transfers/print/stock-transfer-print-page'
import { useAuthStore } from '@/stores/auth.store'

// Route nằm ngoài _app nên không có menu/sidebar/toolbar của app.
export const Route = createFileRoute('/print/stock-transfers/$id')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' })
  },
  component: PrintRoute,
})

function PrintRoute() {
  const { id } = Route.useParams()
  return <StockTransferPrintPage id={id} />
}
