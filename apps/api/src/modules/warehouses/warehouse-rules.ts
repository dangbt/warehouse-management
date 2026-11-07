/** Luật nghiệp vụ thuần của kho — tách khỏi service để test không cần DB. */
export interface WarehouseUsage {
  stockQty: number; // tổng |tồn| mọi mã hàng tại kho
  documents: number; // số chứng từ/lô/giao dịch trỏ tới kho
}

export function deleteBlocker(w: { isDefault: boolean }, usage: WarehouseUsage): string | null {
  if (w.isDefault) return 'Không xoá được kho mặc định';
  if (usage.stockQty !== 0) return 'Kho còn tồn, không xoá được';
  if (usage.documents > 0) return 'Kho đã có chứng từ, không xoá được (chỉ có thể ngừng hoạt động)';
  return null;
}

export function deactivateBlocker(w: { isDefault: boolean }): string | null {
  return w.isDefault ? 'Không ngừng hoạt động kho mặc định' : null;
}

export function normalizeCode(code: string | undefined): string {
  return (code ?? '').trim().toUpperCase();
}
