/** Nhãn ô chọn mã hàng: có SKU thì "SKU · tên", mã hàng F&B cũ (không SKU) giữ nguyên tên. */
export function itemLabel(i: { name: string; sku?: string | null }): string {
  return i.sku ? `${i.sku} · ${i.name}` : i.name
}
