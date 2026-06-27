import { createFileRoute } from '@tanstack/react-router'
import { ProcessingPage } from '@/features/processing/processing-page'
export const Route = createFileRoute('/_app/processing')({ component: ProcessingPage })
