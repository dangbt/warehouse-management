/** Logic thuần của luồng mua hàng (không phụ thuộc DB) — dễ unit test. */

export const DEFAULT_SAFETY_FACTOR = 2;

export type PurchaseOrderStatus = 'UNRECEIVED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

/** Làm tròn LÊN theo bội số của ĐVT mua (factor đơn vị tồn / 1 ĐVT mua). */
export function roundUpToBuyUnit(qty: number, factor: number): number {
  if (qty <= 0) return 0;
  const f = factor > 0 ? factor : 1;
  // làm tròn 6 chữ số để tránh sai số float (vd 2.4000000000000004 / 0.8)
  const packs = Math.ceil(Math.round((qty / f) * 1e6) / 1e6);
  return Math.round(packs * f * 1e3) / 1e3;
}

/** SL gợi ý = minStock × hệ số an toàn − tồn hiện tại, làm tròn lên theo ĐVT mua. 0 nếu không cần mua. */
export function suggestQuantity(minStock: number, currentStock: number, safetyFactor: number, buyFactor: number): number {
  if (currentStock >= minStock) return 0;
  return roundUpToBuyUnit(minStock * safetyFactor - currentStock, buyFactor);
}

export interface LastPurchase {
  supplierId: string;
  unitPrice: number;
  at: number;
}

/** Lấy lần nhập gần nhất (NCC + đơn giá) từ danh sách các lần nhập. */
export function pickLastPurchase(list: LastPurchase[]): LastPurchase | null {
  if (!list.length) return null;
  return list.reduce((a, b) => (b.at > a.at ? b : a));
}

/** Trạng thái PO theo SL đặt/đã nhận của các dòng. */
export function computePoStatus(lines: { quantity: number; receivedQty: number }[]): Exclude<PurchaseOrderStatus, 'CANCELLED'> {
  const received = lines.reduce((s, l) => s + Math.min(round3(l.receivedQty), round3(l.quantity)), 0);
  if (round3(received) <= 0) return 'UNRECEIVED';
  return lines.every((l) => round3(l.receivedQty) >= round3(l.quantity)) ? 'RECEIVED' : 'PARTIAL';
}

/** Làm tròn 3 chữ số thập phân (khớp Decimal(…,3) trong DB) để tránh sai số float khi cộng dồn. */
export function round3(n: number): number {
  return Math.round(n * 1e3) / 1e3;
}

type PoLine = { id: string; ingredientId: string; quantity: number; receivedQty: number };

/** Cộng SL phiếu nhập vào các dòng PO (làm tròn 3 số lẻ). Phần vượt SL đặt dồn vào dòng đầu của NL. */
export function addReceipt(lines: PoLine[], items: { ingredientId: string; quantity: number }[]): PoLine[] {
  const out = lines.map((l) => ({ ...l }));
  for (const it of items) {
    let left = round3(it.quantity);
    const mine = out.filter((x) => x.ingredientId === it.ingredientId);
    for (const l of mine) {
      if (left <= 0) break;
      const take = Math.min(left, Math.max(0, round3(l.quantity - l.receivedQty)));
      l.receivedQty = round3(l.receivedQty + take);
      left = round3(left - take);
    }
    if (left > 0 && mine[0]) mine[0].receivedQty = round3(mine[0].receivedQty + left);
  }
  return out;
}

/** Đảo receipt (bỏ ghi phiếu nhập): trừ SL đã nhận, lấy từ dòng cuối trước, không âm. */
export function removeReceipt(lines: PoLine[], items: { ingredientId: string; quantity: number }[]): PoLine[] {
  const out = lines.map((l) => ({ ...l }));
  for (const it of items) {
    let left = round3(it.quantity);
    for (const l of out.filter((x) => x.ingredientId === it.ingredientId).reverse()) {
      if (left <= 0) break;
      const take = Math.min(left, l.receivedQty);
      l.receivedQty = round3(l.receivedQty - take);
      left = round3(left - take);
    }
  }
  return out;
}

/** SL còn lại cần nhận của một dòng PO (không âm). */
export function remainingQty(quantity: number, receivedQty: number): number {
  return Math.max(0, Math.round((quantity - receivedQty) * 1e3) / 1e3);
}

/** Gom các dòng đề nghị theo NCC (dòng chưa có NCC bị loại và trả về riêng). */
export function groupBySupplier<T extends { supplierId: string | null }>(lines: T[]): { groups: Map<string, T[]>; missing: T[] } {
  const groups = new Map<string, T[]>();
  const missing: T[] = [];
  for (const l of lines) {
    if (!l.supplierId) {
      missing.push(l);
      continue;
    }
    groups.set(l.supplierId, [...(groups.get(l.supplierId) ?? []), l]);
  }
  return { groups, missing };
}
