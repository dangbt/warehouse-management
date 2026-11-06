import { createFileRoute, redirect } from '@tanstack/react-router'
import { StockExportPrintPage } from '@/features/stock-exports/print/stock-export-print-page'
import { useAuthStore } from '@/stores/auth.store'

// Route nằm ngoài _app nên không có menu/sidebar/toolbar của app.
export const Route = createFileRoute('/print/stock-exports/$id')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' })
  },
  component: PrintRoute,
})

function PrintRoute() {
  const { id } = Route.useParams()
  return <StockExportPrintPage id={id} />
}
