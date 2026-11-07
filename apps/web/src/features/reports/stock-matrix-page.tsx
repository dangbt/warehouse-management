import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { WinToolbar } from '@wms/ui-winforms'
import { useStockMatrix } from '@/data'
import { useProducts } from '@/data/use-products'
import { exportSheet } from '@/utils/excel'
import { StockMatrixTable } from './stock-matrix-table'
import { buildMatrixExcel } from './stock-matrix-utils'

export function StockMatrixPage() {
  const [productId, setProductId] = useState('')
  const [category, setCategory] = useState('')
  const { data: products } = useProducts({ limit: 500 })
  const categories = [...new Set((products?.data ?? []).map((p) => p.category).filter((c): c is string => !!c))].sort()
  const { data, isLoading, refetch } = useStockMatrix({ productId: productId || undefined, category: category || undefined })

  async function handleExport() {
    if (!data) return
    const { columns, rows } = buildMatrixExcel(data.products)
    await exportSheet({
      fileName: 'ton-kho-ma-tran',
      title: 'BÁO CÁO TỒN KHO THEO SẢN PHẨM (MÀU × SIZE)',
      headerLines: [category ? `Danh mục: ${category}` : 'Tất cả danh mục'],
      columns,
      rows,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <WinToolbar>
        <select className="text-win-base" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Tất cả sản phẩm</option>
          {products?.data.map((p) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
        </select>
        <select className="text-win-base" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <WinToolbar.Separator />
        <WinToolbar.Button icon={<RefreshCw size={14} />} label="Refresh" onClick={() => refetch()} />
        <WinToolbar.Button icon={<Download size={14} />} label="Xuất Excel" disabled={!data?.products.length} onClick={handleExport} />
      </WinToolbar>
      <div className="px-2 py-1 text-xs flex gap-3">
        <span><span className="inline-block w-3 h-3 align-middle bg-red-200 border mr-1" />Hết hàng</span>
        <span><span className="inline-block w-3 h-3 align-middle bg-amber-200 border mr-1" />Dưới mức tối thiểu</span>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {isLoading ? <div className="p-3">Đang tải...</div>
          : data?.products.length ? data.products.map((m) => <StockMatrixTable key={m.productId} m={m} />)
          : <div className="p-3">Không có sản phẩm</div>}
      </div>
    </div>
  )
}
