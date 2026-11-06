import { createFileRoute, redirect } from '@tanstack/react-router'
import { StocktakePrintPage } from '@/features/stocktake/print/stocktake-print-page'
import { useAuthStore } from '@/stores/auth.store'

// Route nằm ngoài _app nên không có menu/sidebar/toolbar của app.
export const Route = createFileRoute('/print/stocktake/$id')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' })
  },
  component: PrintRoute,
})

function PrintRoute() {
  const { id } = Route.useParams()
  return <StocktakePrintPage id={id} />
}
