import { createRootRoute, Outlet } from '@tanstack/react-router'
import { NotFoundPage } from '@/features/errors/not-found-page'
import { ErrorPage } from '@/features/errors/error-page'

export const Route = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error }) => <ErrorPage error={error as Error} />,
})
