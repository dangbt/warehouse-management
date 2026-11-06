import { formatCurrency, formatNumber } from '@wms/shared'
import { useProductDetail } from '@/data/use-products'

/** Bảng biến thể + tồn từng biến thể của 1 sản phẩm (hiện khi expand dòng). */
export function VariantsPanel({ productId }: { productId: string }) {
  const { data, isLoading } = useProductDetail(productId)
  const items = (data?.items ?? []).filter((i) => i.isActive)
  return (
    <div className="border-t border-win-grid-border max-h-[240px] overflow-auto" data-testid="variants-panel">
      <table className="w-full text-win-base">
        <thead>
          <tr className="bg-win-grid-header">
            <th className="text-left py-1.5 px-2">SKU</th>
            <th className="text-left py-1.5 px-2">Tên</th>
            <th className="text-left py-1.5 px-2">Mã vạch</th>
            <th className="text-right py-1.5 px-2">Giá bán</th>
            <th className="text-right py-1.5 px-2">Giá vốn</th>
            <th className="text-right py-1.5 px-2">Tồn</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-win-grid-border">
              <td className="py-1 px-2">{i.sku ?? '-'}</td>
              <td className="py-1 px-2">{i.name}</td>
              <td className="py-1 px-2">{i.barcode ?? '-'}</td>
              <td className="py-1 px-2 text-right">{i.salePrice != null ? formatCurrency(i.salePrice) : '-'}</td>
              <td className="py-1 px-2 text-right">{formatCurrency(i.costPerUnit)}</td>
              <td className="py-1 px-2 text-right">{formatNumber(i.currentStock)}</td>
            </tr>
          ))}
          {!isLoading && items.length === 0 && (
            <tr>
              <td colSpan={6} className="p-2 text-center text-win-text-secondary">
                Chưa có biến thể
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
