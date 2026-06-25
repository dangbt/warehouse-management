import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/layouts/AppLayout'
import { AppNotFound } from '@/features/errors/AppNotFound'
import { useAuthStore } from '@/stores/auth.store'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayout,
  notFoundComponent: AppNotFound,
})
