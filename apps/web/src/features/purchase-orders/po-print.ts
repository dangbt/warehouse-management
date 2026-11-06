import type { PurchaseOrder } from '@/data'
import { formatCurrency, formatDate, formatNumber } from '@wms/shared'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

/** HTML A4 của đơn mua hàng để gửi NCC (in hoặc "Lưu thành PDF" từ hộp thoại in). */
export function buildPoHtml(po: PurchaseOrder): string {
  const rows = po.items
    .map(
      (i, idx) =>
        `<tr><td class="c">${idx + 1}</td><td>${esc(i.ingredient.name)}</td><td class="c">${esc(i.ingredient.unit)}</td>` +
        `<td class="r">${formatNumber(i.quantity)}</td><td class="r">${formatCurrency(i.unitPrice)}</td>` +
        `<td class="r">${formatCurrency(Number(i.quantity) * Number(i.unitPrice))}</td></tr>`,
    )
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(po.code)}</title><style>
@page{size:A4;margin:15mm}body{font:14px Arial,sans-serif;color:#000}h1{text-align:center;font-size:20px;margin:0 0 4px}
.c{text-align:center}.r{text-align:right}table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #000;padding:5px 6px}th{background:#eee}.meta{margin:4px 0}.sign{display:flex;justify-content:space-around;margin-top:40px;text-align:center}
</style></head><body>
<h1>ĐƠN MUA HÀNG</h1><div class="c">Số: <b>${esc(po.code)}</b> · Ngày ${formatDate(po.createdAt)}</div>
<div class="meta">Nhà cung cấp: <b>${esc(po.supplier.name)}</b></div>
${po.supplier.address ? `<div class="meta">Địa chỉ: ${esc(po.supplier.address)}</div>` : ''}
${po.supplier.phone ? `<div class="meta">Điện thoại: ${esc(po.supplier.phone)}</div>` : ''}
<table><thead><tr><th>STT</th><th>Tên hàng</th><th>ĐVT</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr><td colspan="5" class="r"><b>Tổng cộng</b></td><td class="r"><b>${formatCurrency(po.totalAmount)}</b></td></tr></tfoot></table>
${po.note ? `<div class="meta">Ghi chú: ${esc(po.note)}</div>` : ''}
<div class="sign"><div><b>Người lập</b><br/>(Ký, họ tên)</div><div><b>Nhà cung cấp</b><br/>(Ký, họ tên)</div></div>
</body></html>`
}

export function printPurchaseOrder(po: PurchaseOrder) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write(buildPoHtml(po))
  w.document.close()
  w.focus()
  w.print()
}
