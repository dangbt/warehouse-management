import { createRootRoute, Outlet } from '@tanstack/react-router'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { ErrorPage } from '@/features/errors/ErrorPage'

export const Route = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error }) => <ErrorPage error={error as Error} />,
})
