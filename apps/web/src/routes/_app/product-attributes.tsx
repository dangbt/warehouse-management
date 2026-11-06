import { createFileRoute } from '@tanstack/react-router'
import { AttributesPage } from '@/features/products/attributes-page'
export const Route = createFileRoute('/_app/product-attributes')({ component: AttributesPage })
