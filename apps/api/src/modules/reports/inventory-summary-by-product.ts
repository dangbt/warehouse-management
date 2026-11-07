import {
  VALUE_NOTE,
  addTo,
  emptyTotal,
  sortGroups,
  toSummaryRow,
  type InventorySummaryGroup,
  type InventorySummaryRawRow,
  type InventorySummaryReport,
  type InventorySummaryRow,
} from './inventory-summary';

/**
 * NXT gộp theo sản phẩm (WMS-22): các biến thể cùng product_id thành 1 dòng SP = tổng biến thể
 * (cộng từ chính các dòng biến thể nên tổng luôn khớp); NL không thuộc SP nào giữ nguyên dòng riêng.
 * Dòng SP nằm trong nhóm của biến thể đầu tiên.
 */
export function buildInventorySummaryByProduct(raw: InventorySummaryRawRow[], from: string, to: string): InventorySummaryReport {
  const map = new Map<string, InventorySummaryGroup>();
  const products = new Map<string, InventorySummaryRow>();
  const grand = emptyTotal();

  const groupOf = (r: InventorySummaryRawRow) => {
    const key = r.groupId ?? '';
    let g = map.get(key);
    if (!g) {
      g = { groupId: r.groupId, groupName: r.groupName ?? 'Chưa phân nhóm', rows: [], total: emptyTotal() };
      map.set(key, g);
    }
    return g;
  };

  for (const r of raw) {
    const g = groupOf(r);
    const row = toSummaryRow(r);
    addTo(g.total, row);
    addTo(grand, row);
    if (!r.productId) {
      g.rows.push(row);
      continue;
    }
    let p = products.get(r.productId);
    if (!p) {
      const z = emptyTotal();
      p = {
        ingredientId: r.productId,
        productId: r.productId,
        code: r.productCode ?? r.code,
        name: r.productName ?? r.name,
        unit: r.unit,
        ...z,
        variants: [],
      };
      products.set(r.productId, p);
      g.rows.push(p);
    }
    addTo(p, row);
    p.variants!.push(row);
  }

  const groups = [...map.values()];
  sortGroups(groups);
  for (const g of groups) g.rows.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  for (const p of products.values()) p.variants!.sort((a, b) => a.code.localeCompare(b.code, 'vi'));
  return { from, to, groups, grandTotal: grand, valueNote: VALUE_NOTE };
}
