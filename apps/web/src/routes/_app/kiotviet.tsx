import { createFileRoute } from '@tanstack/react-router'
import { KiotVietPage } from '@/features/kiotviet/kiotviet-page'
export const Route = createFileRoute('/_app/kiotviet')({ component: KiotVietPage })
