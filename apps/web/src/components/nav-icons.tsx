import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  ChefHat,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Flame,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  Library,
  Package,
  Percent,
  ReceiptText,
  Scale,
  ScrollText,
  Settings,
  Settings2,
  ShoppingCart,
  TrendingDown,
  Undo2,
  UtensilsCrossed,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'

/**
 * Bộ icon điều hướng dùng chung (sidebar, menu bar, toolbar) — lucide nét mảnh,
 * thay cho emoji cũ để giao diện đồng bộ và hiện đại hơn.
 */
export const NAV_ICONS: Record<string, LucideIcon> = {
  // nhóm
  warehouse: Warehouse,
  kitchen: ChefHat,
  tax: ReceiptText,
  admin: Settings,
  // trang
  '/dashboard': LayoutDashboard,
  '/ingredients': Package,
  '/ingredient-groups': FolderTree,
  '/import-orders': ArrowDownToLine,
  '/stock-exports': ArrowUpFromLine,
  '/processing': Flame,
  '/suppliers': Building2,
  '/stocktake': ClipboardCheck,
  '/purchase-returns': Undo2,
  '/menu': UtensilsCrossed,
  '/recipes': BookOpen,
  '/kiotviet': ShoppingCart,
  '/tax-settings': Settings2,
  '/tax/input-invoices': FileSpreadsheet,
  '/tax/no-invoice-purchases': FileText,
  '/tax/output-revenue': Percent,
  '/tax/summary': Archive,
  '/tax/books': Library,
  '/reports': BarChart3,
  '/ingredient-usage': TrendingDown,
  '/consumption-variance': Scale,
  '/users': Users,
  '/roles': KeyRound,
  '/audit-logs': ScrollText,
  '/settings-business': Briefcase,
}

export function NavIcon({ id, size = 16, className }: { id: string; size?: number; className?: string }) {
  const Icon = NAV_ICONS[id]
  if (!Icon) return null
  return <Icon size={size} strokeWidth={1.75} className={className ?? 'shrink-0 text-win-active-title'} aria-hidden />
}
