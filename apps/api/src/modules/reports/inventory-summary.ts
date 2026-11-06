/**
 * Báo cáo Tổng hợp Nhập – Xuất – Tồn: kiểu dữ liệu + hàm thuần dựng báo cáo từ các dòng đã gom theo NL.
 * Query DB nằm ở inventory-summary.repository.ts.
 *
 * Ghi chú giá trị: lấy theo giá vốn lưu trên giao dịch (total_cost, WMS-6); giao dịch cũ chưa có
 * thì dự phòng total_price hoặc |SL| × giá vốn hiện hành của NL.
 */

export interface QtyValue {
  qty: number;
  value: number;
}

/** Một dòng thô từ SQL group by (1 NL). Xuất là số dương (độ lớn). */
export interface InventorySummaryRawRow {
  ingredientId: string;
  code: string;
  name: string;
  unit: string;
  groupId: string | null;
  groupName: string | null;
  openingQty: number;
  openingValue: number;
  inQty: number;
  inValue: number;
  outQty: number;
  outValue: number;
}

export interface InventorySummaryRow {
  ingredientId: string;
  code: string;
  name: string;
  unit: string;
  opening: QtyValue;
  inbound: QtyValue;
  outbound: QtyValue;
  closing: QtyValue;
}

export interface InventorySummaryGroup {
  groupId: string | null;
  groupName: string;
  rows: InventorySummaryRow[];
  total: Omit<InventorySummaryRow, 'ingredientId' | 'code' | 'name' | 'unit'>;
}

export interface InventorySummaryReport {
  from: string;
  to: string;
  groups: InventorySummaryGroup[];
  grandTotal: InventorySummaryGroup['total'];
  valueNote: string;
}

export const VALUE_NOTE =
  'Giá trị theo giá vốn lưu trên giao dịch; giá xuất kho tính theo phương pháp đã cấu hình (chạy "Tính giá xuất kho" để chốt giá bình quân cuối kỳ).';

const NO_GROUP_NAME = 'Chưa phân nhóm';

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;

type Total = InventorySummaryGroup['total'];

function emptyTotal(): Total {
  const z = () => ({ qty: 0, value: 0 });
  return { opening: z(), inbound: z(), outbound: z(), closing: z() };
}

function addTo(total: Total, row: Total): void {
  for (const k of ['opening', 'inbound', 'outbound', 'closing'] as const) {
    total[k].qty = r3(total[k].qty + row[k].qty);
    total[k].value = r2(total[k].value + row[k].value);
  }
}

export function toSummaryRow(r: InventorySummaryRawRow): InventorySummaryRow {
  return {
    ingredientId: r.ingredientId,
    code: r.code,
    name: r.name,
    unit: r.unit,
    opening: { qty: r3(r.openingQty), value: r2(r.openingValue) },
    inbound: { qty: r3(r.inQty), value: r2(r.inValue) },
    outbound: { qty: r3(r.outQty), value: r2(r.outValue) },
    // Cuối kỳ = đầu kỳ + nhập − xuất
    closing: {
      qty: r3(r.openingQty + r.inQty - r.outQty),
      value: r2(r.openingValue + r.inValue - r.outValue),
    },
  };
}

/** Gom các dòng NL theo nhóm, tính dòng tổng nhóm + tổng cộng. Nhóm sắp theo tên, "Chưa phân nhóm" cuối. */
export function buildInventorySummary(raw: InventorySummaryRawRow[], from: string, to: string): InventorySummaryReport {
  const map = new Map<string, InventorySummaryGroup>();
  const grand = emptyTotal();
  for (const r of raw) {
    const key = r.groupId ?? '';
    let g = map.get(key);
    if (!g) {
      g = { groupId: r.groupId, groupName: r.groupName ?? NO_GROUP_NAME, rows: [], total: emptyTotal() };
      map.set(key, g);
    }
    const row = toSummaryRow(r);
    g.rows.push(row);
    addTo(g.total, row);
    addTo(grand, row);
  }
  const groups = [...map.values()].sort((a, b) => {
    if (a.groupId === null) return 1;
    if (b.groupId === null) return -1;
    return a.groupName.localeCompare(b.groupName, 'vi');
  });
  for (const g of groups) g.rows.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  return { from, to, groups, grandTotal: grand, valueNote: VALUE_NOTE };
}
