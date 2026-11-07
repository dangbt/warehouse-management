import { createFileRoute, redirect } from '@tanstack/react-router'
import { LabelPrintPage } from '@/features/ingredients/print/label-print-page'
import { useAuthStore } from '@/stores/auth.store'

// Route nằm ngoài _app nên không có menu/sidebar/toolbar của app. `id` = id hàng (nhiều id cách nhau dấu phẩy).
export const Route = createFileRoute('/print/labels/$id')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' })
  },
  component: PrintRoute,
})

function PrintRoute() {
  const { id } = Route.useParams()
  return <LabelPrintPage id={id} />
}
