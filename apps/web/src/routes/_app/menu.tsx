import { createFileRoute } from '@tanstack/react-router'
import { MenuPage } from '@/features/menu/menu-page'
export const Route = createFileRoute('/_app/menu')({ component: MenuPage })
